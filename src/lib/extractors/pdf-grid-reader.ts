// Importamos el submódulo directamente (no el entrypoint del paquete): el
// index.js de pdf-parse@1.1.1 ejecuta código de "modo debug" al cargarse
// cuando module.parent es undefined -algo que pasa durante el tracing de
// build de Next.js- e intenta leer un PDF de test que no existe, rompiendo
// el build. Mismo motivo que en pdf-extractor.ts.
import pdf from 'pdf-parse/lib/pdf-parse.js';

interface Item {
  str: string;
  x: number;
  y: number;
}

// Palabras que suelen aparecer en la fila de encabezado de un reporte de
// Sailwave, en cualquiera de sus variantes de nombre de columna. Se usa
// solo para ENCONTRAR cuál fila es el encabezado (no para decidir qué es
// cada columna -eso lo hace column-detector.ts después, por la forma de
// los datos igual que con Excel).
const PALABRAS_ENCABEZADO = new Set([
  'pl', 'pl.', 'puesto', 'sail', 'vela', 'crew', 'skipper', 'helm', 'helmname',
  'navegante', 'nombre', 'subgroup', 'split', 'flota', 'from', 'club',
  'tot', 'total', 'puntos',
]);

const normalizar = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, '');

async function extraerItemsPorPagina(buffer: Buffer): Promise<Item[][]> {
  const paginas: Item[][] = [];
  await pdf(buffer, {
    // pdf-parse nos deja "renderizar" cada página nosotros mismos; en vez
    // de usar su render por defecto (que concatena todo a texto plano y
    // pierde la posición), tomamos los items crudos de pdf.js con su x/y.
    pagerender: async (pageData: any) => {
      const tc = await pageData.getTextContent();
      paginas.push(
        tc.items.map((it: any) => ({
          str: it.str,
          x: Math.round(it.transform[4] * 100) / 100,
          y: Math.round(it.transform[5] * 100) / 100,
        }))
      );
      return '';
    },
  });
  return paginas;
}

function agruparPorFila(items: Item[], tolerancia = 2): Item[][] {
  const porY = new Map<number, Item[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    let claveY = item.y;
    // Buscamos si ya existe un grupo a menos de `tolerancia` de distancia
    // -evita que un redondeo de décimas cree dos filas para la misma línea.
    for (const y of porY.keys()) {
      if (Math.abs(y - claveY) <= tolerancia) { claveY = y; break; }
    }
    if (!porY.has(claveY)) porY.set(claveY, []);
    porY.get(claveY)!.push(item);
  }
  // De mayor a menor Y = de arriba hacia abajo de la página.
  return [...porY.entries()].sort((a, b) => b[0] - a[0]).map(([, items]) => items.sort((a, b) => a.x - b.x));
}

/**
 * Lee un PDF con una tabla de resultados a una grilla {header, rows}, igual
 * que leerGridXLSX -así ambos pasan por el mismo detector de columnas y la
 * misma pantalla de confirmación en vez de tener un parser aparte.
 *
 * A diferencia de un Excel, acá no hay celdas reales: reconstruimos las
 * columnas por posición horizontal. Cada celda del encabezado marca dónde
 * empieza esa columna; todo texto de una fila de datos que caiga en ese
 * rango de X (aunque sean varias palabras, como un nombre de tripulación
 * largo) se junta como el valor de esa celda.
 */
export async function leerGridPDF(buffer: Buffer): Promise<{ header: string[]; rows: any[][] }> {
  const paginas = await extraerItemsPorPagina(buffer);
  if (paginas.length === 0 || paginas[0].length === 0) {
    throw new Error('No se pudo leer texto del PDF (¿es una imagen escaneada sin texto?).');
  }

  const filasPagina1 = agruparPorFila(paginas[0]);

  // Encontrar la fila de encabezado: la que tiene más items que matchean
  // alguna palabra típica de encabezado (Pl, Sail, Crew, Total, etc.).
  let mejorFila: Item[] | null = null;
  let mejorPuntaje = 0;
  for (const fila of filasPagina1) {
    const puntaje = fila.filter((it) => PALABRAS_ENCABEZADO.has(normalizar(it.str))).length;
    if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejorFila = fila; }
  }

  if (!mejorFila || mejorPuntaje < 2) {
    throw new Error('No se encontró una fila de encabezado reconocible en el PDF (se esperaban columnas como Pl, Sail, Crew, Total...).');
  }

  // Cada item del encabezado (que no sea un espacio suelto) es el ancla de
  // una columna. Los límites entre columnas son el punto medio entre dos
  // anclas consecutivas.
  const anclas = mejorFila.filter((it) => it.str.trim().length > 0);
  const limites = anclas.map((a, i) =>
    i === 0 ? -Infinity : (anclas[i - 1].x + a.x) / 2
  );
  const headerCompleto = anclas.map((a) => a.str.trim());

  // OJO: un PDF no tiene celdas reales con ancho fijo -son solo palabras
  // posicionadas-, así que un nombre de tripulación largo puede invadir
  // visualmente la columna de al lado cuando esa fila la tiene vacía (ej:
  // "Subgroup" en blanco), y un club compuesto ("CPNLB-CBRIO", que en
  // tripulaciones de dos personas suele ser "un club por integrante", no
  // un club raro) puede a su vez invadir la columna de "Tot". En vez de
  // confiar en el límite calculado entre Nombre/Subgroup/Club/Total,
  // juntamos las cuatro en un solo bloque de texto (usando directamente
  // los items de esa fila, no los baldes por columna) y las separamos de
  // nuevo nosotros: el Total es el último número del bloque, el Club son
  // las palabras en MAYÚSCULAS antes de eso, y el resto es el nombre.
  const idxNombre = headerCompleto.findIndex((h) => /^(crew|skipper|helm|navegante|nombre)/i.test(normalizar(h)));
  const idxClub = headerCompleto.findIndex((h) => /^(from|club)/i.test(normalizar(h)));
  const idxTotal = headerCompleto.findIndex((h) => /^(tot|total)/i.test(normalizar(h)));
  const rangoAFusionar = idxNombre !== -1 && idxClub !== -1 && idxTotal !== -1 && idxNombre < idxClub && idxClub <= idxTotal
    ? { desde: idxNombre, club: idxClub, hasta: idxTotal }
    : null;

  // El encabezado final mantiene Nombre, Club y Total como celdas propias
  // (se reconstruyen con separarBloque() más abajo); cualquier otra
  // columna en el medio (ej: "Subgroup") queda absorbida.
  const header = headerCompleto.filter((_, i) => {
    if (!rangoAFusionar) return true;
    if (i <= rangoAFusionar.desde || i >= rangoAFusionar.hasta) return true;
    return i === rangoAFusionar.club;
  });

  const columnaDe = (x: number): number => {
    let col = 0;
    for (let i = 1; i < limites.length; i++) {
      if (x >= limites[i]) col = i;
    }
    return col;
  };

  // Palabras de subgrupo comunes que, si quedan pegadas al final del
  // nombre tras separar club y total, las sacamos igual -no hay forma
  // general de saber dónde termina el nombre y empieza el subgrupo sin
  // una celda real que los separe.
  const SUBGRUPOS_CONOCIDOS = /\s+(femenino|masculino|damas|caballeros|sub\s?\d{1,2}(\s*&\s*(fem|masc)\w*)?|master|junior|juvenil|infantil)$/i;
  // Un código de club es una palabra en mayúsculas (o el guión que conecta
  // dos códigos: "CPNLB-CBRIO", un club por integrante de la tripulación).
  const esCodigoDeClub = (palabra: string) => palabra === '-' || /^[A-Z0-9][A-Z0-9.]*$/.test(palabra);
  // El total es un número entero simple -no lleva paréntesis ni códigos
  // de penalidad como sí pueden llevar las regatas.
  const esTotal = (palabra: string) => /^\d+(\.\d+)?$/.test(palabra);

  const separarBloque = (bloque: string): { nombre: string; club: string; total: string } => {
    const palabras = bloque.split(/\s+/).filter(Boolean);
    let i = palabras.length - 1;

    let total = '';
    if (i >= 0 && esTotal(palabras[i])) { total = palabras[i]; i--; }

    const clubPalabras: string[] = [];
    while (i >= 0 && esCodigoDeClub(palabras[i])) { clubPalabras.unshift(palabras[i]); i--; }
    let club = '';
    for (const p of clubPalabras) {
      club = !club || p === '-' || club.endsWith('-') ? club + p : club + ' ' + p;
    }

    const nombre = palabras.slice(0, i + 1).join(' ').replace(SUBGRUPOS_CONOCIDOS, '').trim();
    return { nombre, club, total };
  };

  const filaAGrid = (fila: Item[]): any[] | null => {
    if (!rangoAFusionar) {
      const celdas: string[] = Array(header.length).fill('');
      for (const item of fila) {
        const texto = item.str.trim();
        if (!texto) continue;
        const col = columnaDe(item.x);
        celdas[col] = celdas[col] ? `${celdas[col]} ${texto}` : texto;
      }
      return celdas;
    }

    const anchoInicio = limites[rangoAFusionar.desde];
    const anchoFin = rangoAFusionar.hasta + 1 < limites.length ? limites[rangoAFusionar.hasta + 1] : Infinity;
    const itemsDelBloque = fila.filter((it) => it.x >= anchoInicio && it.x < anchoFin && it.str.trim());
    const bloque = itemsDelBloque.map((it) => it.str.trim()).join(' ');
    const { nombre, club, total } = separarBloque(bloque);

    const salida: string[] = [];
    for (let i = 0; i < headerCompleto.length; i++) {
      if (i === rangoAFusionar.desde) { salida.push(nombre); continue; }
      if (i === rangoAFusionar.club) { salida.push(club); continue; }
      if (i === rangoAFusionar.hasta) { salida.push(total); continue; }
      if (i > rangoAFusionar.desde && i < rangoAFusionar.hasta) continue; // absorbida
      const texto = fila.filter((it) => columnaDe(it.x) === i).map((it) => it.str.trim()).filter(Boolean).join(' ');
      salida.push(texto);
    }
    return salida;
  };

  const filasGrid: any[][] = [];
  for (let p = 0; p < paginas.length; p++) {
    const filas = p === 0 ? filasPagina1 : agruparPorFila(paginas[p]);
    for (const fila of filas) {
      // Saltar la fila de encabezado si se repite en cada página, y
      // cualquier otra línea (título del club, timestamp de pie de
      // página) que no sea una fila de datos real: una fila de datos
      // siempre arranca con un número en su primera columna (el puesto).
      const puntajeEncabezado = fila.filter((it) => PALABRAS_ENCABEZADO.has(normalizar(it.str))).length;
      if (puntajeEncabezado >= 2) continue;

      const grid = filaAGrid(fila);
      if (!grid) continue;
      const primerCelda = grid[0]?.trim();
      if (!primerCelda || isNaN(Number(primerCelda.replace(/[^\d.-]/g, '')))) continue;

      filasGrid.push(grid);
    }
  }

  if (filasGrid.length === 0) {
    throw new Error('No se pudo identificar filas de datos en el PDF.');
  }

  return { header, rows: filasGrid };
}
