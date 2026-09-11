import * as XLSX from 'xlsx';
import { ParseResult } from './csv-parser';

// Lo que puede haber en una celda cruda de Excel o de la grilla reconstruida
// de un PDF (ver pdf-grid-reader.ts) -antes de que numeroDeCelda()/armarParseResult()
// la interpreten como texto o número.
export type CeldaValor = string | number | boolean | Date | null | undefined;
export type FilaCruda = CeldaValor[];

/**
 * Columnas esperadas del Excel, en este orden:
 *   puesto | vela | navegante | Subgroup division | club | Total puntos | regata 1 | regata 2 | ...
 *
 * A propósito NO se interpreta ni recalcula nada: "puesto" y "Total puntos"
 * son los valores finales tal cual los trae el archivo (no los recalculamos
 * con descartes/desempates/orden de flota nuestro), y cada celda "regata N"
 * se toma literal si es un número. Esto evita justamente los bugs que
 * tuvimos antes tratando de reproducir el cálculo de puntaje de Sailwave
 * (descartes, flotas superpuestas, códigos de penalidad) -acá la fuente ya
 * trae el resultado final calculado, así que la app solo lo lee y lo
 * guarda.
 */
export const XLSX_TEMPLATE_COLUMNS = [
  'puesto',
  'vela',
  'navegante',
  'Subgroup division',
  'club',
  'Total puntos',
] as const;

export interface ColumnMapping {
  puestoCol: number;
  velaCol: number;
  // Primera (o única) columna de navegante. Algunas fuentes traen el
  // timonel y el/los tripulante(s) en columnas SEPARADAS ("Helm"/"Skipper"
  // y "Crew") en vez de una sola celda "Fulano & Mengano" -en ese caso
  // nombreCol es la del timonel y nombreColsExtra las de los tripulantes,
  // en orden. Se combinan con " & " antes de seguir el mismo camino que un
  // nombre ya combinado (splitNombreTripulacion en import-service.ts).
  nombreCol: number;
  nombreColsExtra?: number[];
  // Primera (o única) columna de club. En tripulaciones de más de una
  // persona a veces el archivo trae una columna de club POR tripulante en
  // vez de una sola celda con todos juntos -en ese caso clubCol es la del
  // primero y clubColsExtra las de los siguientes, en orden.
  clubCol: number;
  clubColsExtra?: number[];
  flotaCol: number | null;
  totalCol: number;
  // Cada columna de regata, en el orden en que deben numerarse (no
  // necesariamente el orden del archivo, aunque normalmente coincide).
  regataCols: { colIndex: number; numero: number }[];
  // Columnas que no son ninguno de los campos fijos de arriba pero el
  // admin eligió conservar igual, con el nombre que les quiera poner (ej:
  // "Categoría", "DNI") -se guardan tal cual en Resultado.datosExtra.
  columnasPersonalizadas?: { colIndex: number; nombre: string }[];
}

/** Extrae el primer número de una celda ("(16 BFD)" -> 16, "-20" -> -20). */
export function numeroDeCelda(v: CeldaValor): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const match = String(v).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

const filaVacia = (r: FilaCruda) => r.every((v) => v === null || v === undefined || v === '');
const celdasLlenas = (r: FilaCruda) => r.filter((v) => v !== null && v !== undefined && v !== '').length;

/**
 * Algunos reportes de Sailwave, cuando dos botes empatan en puntaje total,
 * exportan la celda de "Pl" (puesto) con un rowspan que abarca ambas filas
 * -al pasar por Excel/SheetJS eso se parte en dos filas: una con todos los
 * datos del bote MENOS el puesto, y otra fila suelta más abajo que trae
 * solo ese puesto (y a veces una fila en blanco de por medio, separando
 * cada bote). El resultado es indistinguible de dos filas reales si no se
 * reconstruye antes de seguir -así que cada fila de datos a la que le
 * falte algún valor lo toma prestado de la próxima fila "suelta" (con un
 * solo valor) que encuentre, y las filas en blanco se descartan.
 *
 * Es un no-op para un archivo bien formado (una fila = un resultado): no
 * hay filas sueltas de un solo valor para pedir prestadas, así que nunca
 * cambia nada ahí.
 */
export function repararFilasDivididas(rows: FilaCruda[]): FilaCruda[] {
  const consumida = new Set<number>();
  const resultado: FilaCruda[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (consumida.has(i)) continue;
    const fila = rows[i];
    if (filaVacia(fila)) continue;
    if (celdasLlenas(fila) === 1) continue; // fila suelta que nadie reclamó

    const filaCombinada = [...fila];
    for (let j = i + 1; j <= i + 2 && j < rows.length; j++) {
      if (consumida.has(j)) continue;
      const candidata = rows[j];
      if (filaVacia(candidata)) continue;
      if (celdasLlenas(candidata) !== 1) break; // ya es la próxima fila de datos real
      const idx = candidata.findIndex((v) => v !== null && v !== undefined && v !== '');
      if (idx !== -1 && (filaCombinada[idx] === null || filaCombinada[idx] === undefined || filaCombinada[idx] === '')) {
        filaCombinada[idx] = candidata[idx];
        consumida.add(j);
      }
      break;
    }
    resultado.push(filaCombinada);
  }

  return resultado;
}

/**
 * Lee un .xlsx a una grilla cruda: encabezado + filas de datos. El
 * encabezado sale de la PRIMERA hoja; si el archivo tiene más de una hoja
 * (reportes de flotas grandes que Sailwave/Excel parte en "Table 1",
 * "Table 2", etc. sin repetir el encabezado) se juntan todas como si fueran
 * una sola tabla continua.
 */
export function leerGridXLSX(buffer: Buffer): { header: string[]; rows: FilaCruda[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const filasPorHoja = workbook.SheetNames.map(
    (nombre) => XLSX.utils.sheet_to_json(workbook.Sheets[nombre], { header: 1, raw: true, defval: null }) as FilaCruda[]
  );

  const [primeraHoja, ...restoDeHojas] = filasPorHoja;
  if (!primeraHoja || primeraHoja.length < 2) {
    throw new Error('El archivo Excel no tiene filas de datos.');
  }

  const header = primeraHoja[0].map((h) => (h === null || h === undefined ? '' : String(h).trim()));
  const rows = [...primeraHoja.slice(1), ...restoDeHojas.flat()];

  return { header, rows: repararFilasDivididas(rows) };
}

// Comparamos ignorando may/min, tildes, y cualquier caracter que no sea
// letra o número -así "Sail #", "Sail#" y "sail" son todos la misma
// columna, en vez de exigir que el encabezado coincida carácter por
// carácter con alguno de nuestros nombres esperados.
//
// El paso normalize('NFD') + quitar diacríticos es necesario: antes esto
// solo borraba directo cualquier caracter fuera de a-z0-9, así que una
// tilde no se convertía en la letra sin tilde -desaparecía. "Tripulación"
// quedaba "tripulacin" (sin la "o"), que nunca iba a matchear contra el
// sinónimo 'tripulacion'. Con NFD, "ó" se separa en "o" + un diacrítico
// combinante aparte, que la segunda regex sí saca limpio.
const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function buscarPorNombre(header: string[], ...names: string[]): number {
  const normalizados = names.map(normalizar);
  return header.findIndex((h) => normalizados.includes(normalizar(h)));
}

/** Matchea columnas por el texto del encabezado. -1 cuando no encuentra. */
export function detectarPorEncabezado(header: string[]) {
  // El timonel/skipper puede estar en una columna con nombre propio
  // ("Skipper", "Helm", "Timonel") separada de la del tripulante ("Crew",
  // "CrewName") -típico en clases de más de una persona por bote como F18,
  // J70, RAPTOR o Star, que exportan Helm/Crew como dos columnas en vez de
  // una sola celda "Fulano & Mengano". Si existe una columna de timonel
  // reconocible, esa es nombreCol y, si ADEMÁS hay una de tripulante
  // distinta, se devuelve como nombreColsExtra (el importador la junta con
  // " & "). Si no hay columna de timonel separada, "Crew"/"Nombre" es la
  // única columna de nombre (ya viene combinada, como en 29er: "Fulano &
  // Mengano" en una sola celda).
  const timonelCol = buscarPorNombre(header, 'skipper', 'helm', 'helmname', 'timonel');
  const tripulanteCol = buscarPorNombre(header, 'crew', 'crewname', 'tripulante');
  // "Tripulación" -sin columna de timonel separada- es otra forma de traer
  // el nombre ya combinado en una sola celda ("BLOSSON & BLOSSON"), vista en
  // los archivos de Vela Fest 2025 (29er, 420): no significa "columna de
  // tripulante adicional" acá, es la única columna de nombre que hay.
  const nombreCol = timonelCol !== -1 ? timonelCol : buscarPorNombre(header, 'navegante', 'nombre', 'crew', 'tripulacion');
  const nombreColsExtra = timonelCol !== -1 && tripulanteCol !== -1 && tripulanteCol !== nombreCol ? [tripulanteCol] : [];

  return {
    puestoCol: buscarPorNombre(header, 'puesto', 'pl', 'pl.', 'rank'),
    // "Proa" (número de proa) es el fallback para RAPTOR y clases
    // similares que no numeran veleros con un "Sail #"/"Vela" propio, sino
    // con el número de proa asignado para esa regata -cumple el mismo rol
    // acá (un identificador numérico por bote). Va DESPUÉS de vela/sail a
    // propósito: algunas fuentes (ej: J70) traen ambas columnas, "Proa" Y
    // "Vela", y la que realmente identifica al barco en el resto de la app
    // es "Vela".
    velaCol: buscarPorNombre(header, 'vela', 'sail', 'sailno', 'sailnumber', 'nrovela') !== -1
      ? buscarPorNombre(header, 'vela', 'sail', 'sailno', 'sailnumber', 'nrovela')
      : buscarPorNombre(header, 'proa'),
    nombreCol,
    nombreColsExtra,
    flotaCol: buscarPorNombre(header, 'Subgroup division', 'subgroup division', 'subgroup', 'flota', 'split', 'split #4', 'categoria', 'category'),
    clubCol: buscarPorNombre(header, 'club', 'from'),
    // Cuando el archivo trae "Total" (la suma bruta de TODAS las regatas,
    // sin descartar nada) Y "Nett" (el neto, después de aplicar los
    // descartes) como dos columnas separadas -común en exportaciones tipo
    // Sailwave, visto en Semana de Buenos Aires y Vela Fest 2025-, el valor
    // que de verdad representa el puntaje final de cada regatista es
    // "Nett", no "Total". Antes esto matcheaba "Total" siempre (viene
    // primero en la lista de sinónimos) y ese puntaje bruto -inflado en
    // exactamente los puntos de la regata descartada- se guardaba como
    // totalOficial. Preferimos "Nett"/"Neto" cuando existe; si no hay
    // columna separada (la mayoría de las fuentes solo traen una, que ES
    // el puntaje final), seguimos cayendo en "Total"/"Tot" como antes.
    totalCol: buscarPorNombre(header, 'nett', 'neto') !== -1
      ? buscarPorNombre(header, 'nett', 'neto')
      : buscarPorNombre(header, 'Total puntos', 'total puntos', 'total', 'tot', 'tot.'),
  };
}

/** Arma el ParseResult[] de un grid ya leído, dado un mapeo de columnas confirmado. */
export function armarParseResult(header: string[], rows: FilaCruda[], mapping: ColumnMapping): ParseResult[] {
  const { puestoCol, velaCol, nombreCol, nombreColsExtra, clubCol, clubColsExtra, flotaCol, totalCol, regataCols, columnasPersonalizadas } = mapping;

  const regatistas: ParseResult[] = [];

  for (const row of rows) {
    const nombrePrincipal = row[nombreCol];
    if (!nombrePrincipal || typeof nombrePrincipal !== 'string' || !nombrePrincipal.trim()) continue;

    // Si hay columnas de navegante adicionales (timonel y tripulante(s) en
    // columnas separadas, en vez de una sola celda "Fulano & Mengano"), las
    // juntamos acá con " & " -de ahí en más sigue el mismo camino que un
    // nombre ya combinado (splitNombreTripulacion en import-service.ts se
    // encarga de separarlos en regatistas individuales).
    const nombre = nombreColsExtra && nombreColsExtra.length > 0
      ? [nombrePrincipal, ...nombreColsExtra.map((idx) => row[idx])]
          .map((v) => (v !== null && v !== undefined ? String(v).trim() : ''))
          .filter(Boolean)
          .join(' & ')
      : nombrePrincipal;

    const puestoOficial = numeroDeCelda(row[puestoCol]);
    const totalOficial = numeroDeCelda(row[totalCol]);
    const vela = row[velaCol];
    const club = row[clubCol];
    // Si hay columnas de club adicionales (una por tripulante extra), ya
    // sabemos el club de cada uno sin tener que separar un texto combinado
    // -se guardan en orden para que import-service.ts las use directo.
    const clubesPorColumna = clubColsExtra && clubColsExtra.length > 0
      ? [club, ...clubColsExtra.map((idx) => row[idx])].map((v) => (v !== null && v !== undefined ? String(v).trim() : ''))
      : undefined;
    const flotaRaw = flotaCol !== null ? row[flotaCol] : null;
    const flota = flotaRaw !== null && flotaRaw !== undefined && String(flotaRaw).trim() ? String(flotaRaw).trim() : undefined;

    const regatas: ParseResult['regatas'] = [];
    for (const { numero, colIndex } of regataCols) {
      const valor = numeroDeCelda(row[colIndex]);
      if (valor === null) continue; // celda vacía: no navegó esta regata
      regatas.push({ numero, puntajeBruto: Math.abs(valor), observacion: null });
    }

    let datosExtra: Record<string, string> | undefined;
    if (columnasPersonalizadas && columnasPersonalizadas.length > 0) {
      for (const { colIndex, nombre: nombreCampo } of columnasPersonalizadas) {
        const valor = row[colIndex];
        if (valor === null || valor === undefined || String(valor).trim() === '') continue;
        if (!datosExtra) datosExtra = {};
        datosExtra[nombreCampo] = String(valor).trim();
      }
    }

    regatistas.push({
      vela: vela !== null && vela !== undefined ? String(vela).trim() : '',
      nombre: nombre.trim(),
      club: club !== null && club !== undefined ? String(club).trim() : '',
      clubesPorColumna,
      flota,
      puestoOficial: puestoOficial !== null ? Math.round(puestoOficial) : undefined,
      totalOficial: totalOficial !== null ? totalOficial : undefined,
      datosExtra,
      regatas,
    });
  }

  if (regatistas.length === 0) {
    throw new Error('No se pudo identificar regatistas en el archivo Excel.');
  }

  return regatistas;
}

/**
 * Camino directo (sin vista previa/confirmación): detecta columnas solo por
 * el texto del encabezado y arma el resultado. Lo sigue usando la
 * importación de CSV/PDF y cualquier uso programático directo; el flujo de
 * admin desde la web pasa primero por el endpoint de preview + confirmación
 * de columnas (ver column-detector.ts), que también sabe reconocer
 * columnas por la FORMA de los datos cuando el encabezado no ayuda.
 */
export function parseSailwaveXLSX(buffer: Buffer): ParseResult[] {
  const { header, rows } = leerGridXLSX(buffer);
  const { puestoCol, velaCol, nombreCol, flotaCol, clubCol, totalCol } = detectarPorEncabezado(header);

  if (puestoCol === -1 || velaCol === -1 || nombreCol === -1 || clubCol === -1 || totalCol === -1) {
    throw new Error(
      'El Excel no tiene las columnas esperadas. Deben ser, en este orden: puesto, vela, navegante, Subgroup division, club, Total puntos, regata 1, regata 2...'
    );
  }

  const regataCols = header
    .map((h, colIndex) => ({ h, colIndex }))
    .filter(({ h, colIndex }) => colIndex > totalCol && h.length > 0)
    .map(({ colIndex }, i) => ({ numero: i + 1, colIndex }));

  if (regataCols.length === 0) {
    throw new Error('No se encontraron columnas de regatas después de "Total puntos" (ej: "regata 1", "regata 2"...).');
  }

  return armarParseResult(header, rows, {
    puestoCol,
    velaCol,
    nombreCol,
    clubCol,
    flotaCol: flotaCol === -1 ? null : flotaCol,
    totalCol,
    regataCols,
  });
}
