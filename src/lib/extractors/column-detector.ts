import { numeroDeCelda, detectarPorEncabezado } from './xlsx-parser';

export type RolColumna = 'puesto' | 'vela' | 'navegante' | 'club' | 'flota' | 'total' | 'regata' | 'ignorar';

export interface ColumnaSugerida {
  index: number;
  header: string;
  rol: RolColumna;
  // Solo para rol "regata": el número que le corresponde (1, 2, 3...),
  // según el orden de las columnas de regata detectadas.
  numeroRegata?: number;
  muestra: string[];
}

/**
 * Sugiere qué es cada columna de un archivo importado, combinando dos
 * señales:
 *  1. El texto del encabezado (rápido y confiable cuando coincide con algo
 *     conocido: "Pl.", "Sail #", "Skipper", "Total", etc.)
 *  2. La FORMA de los datos, cuando el encabezado no dice nada reconocible
 *     -por ejemplo "puesto" se reconoce porque sus valores son 1, 2, 3...
 *     en orden, y "Total" porque su valor coincide con la suma de las
 *     columnas numéricas a su derecha (descartando alguna, si hace falta).
 *
 * Esto es solo una SUGERENCIA: se muestra en una pantalla de confirmación
 * antes de importar nada, así que un acierto parcial es aceptable -el
 * admin corrige lo que haga falta con un click en vez de que el sistema
 * adivine mal en silencio sobre un ranking oficial.
 */
export function detectarColumnas(header: string[], rows: any[][]): ColumnaSugerida[] {
  const numCols = header.length;
  const numRows = rows.length;

  const columnas = (idx: number) => rows.map((r) => r[idx]);

  // --- Estadísticas por columna ---
  const stats = Array.from({ length: numCols }, (_, c) => {
    const valoresCrudos = columnas(c).filter((v) => v !== null && v !== undefined && v !== '');
    const numeros = valoresCrudos.map(numeroDeCelda).filter((n): n is number => n !== null);
    const textos = valoresCrudos.filter((v) => typeof v === 'string' && numeroDeCelda(v) === null);

    const ratioLleno = valoresCrudos.length / Math.max(numRows, 1);
    const ratioNumerico = valoresCrudos.length ? numeros.length / valoresCrudos.length : 0;

    const textosUnicos = new Set(textos.map((t) => String(t).trim().toLowerCase()));
    const ratioUnicoTexto = textos.length ? textosUnicos.size / textos.length : 0;

    const numerosUnicos = new Set(numeros);
    const ratioUnicoNumero = numeros.length ? numerosUnicos.size / numeros.length : 0;

    const promedioPalabras = textos.length
      ? textos.reduce((s, t) => s + String(t).trim().split(/\s+/).length, 0) / textos.length
      : 0;

    // ¿Los valores de esta columna van 1, 2, 3... en el mismo orden que las
    // filas? (típico de "puesto"; una columna de puntajes de regata NO
    // tiene este patrón, salda al azar según quién ganó cada una).
    let secuencial = 0;
    rows.forEach((row, i) => {
      const n = numeroDeCelda(row[c]);
      if (n !== null && Math.abs(n - (i + 1)) <= 2) secuencial++;
    });
    const ratioSecuencial = secuencial / Math.max(numRows, 1);

    return { index: c, valoresCrudos, numeros, textos, ratioLleno, ratioNumerico, ratioUnicoTexto, ratioUnicoNumero, promedioPalabras, ratioSecuencial };
  });

  // --- 1. Total: la columna numérica cuyo valor coincide con la suma de
  // las columnas numéricas a su derecha (permitiendo 0, 1 o 2 descartes) ---
  let totalCol = -1;
  let mejorAcierto = 0;
  for (let c = 0; c < numCols; c++) {
    if (stats[c].ratioNumerico < 0.5 || stats[c].ratioLleno < 0.3) continue;
    let aciertos = 0;
    let comparables = 0;
    rows.forEach((row) => {
      const total = numeroDeCelda(row[c]);
      if (total === null) return;
      const posteriores: number[] = [];
      for (let c2 = c + 1; c2 < numCols; c2++) {
        const v = numeroDeCelda(row[c2]);
        if (v !== null) posteriores.push(Math.abs(v));
      }
      if (posteriores.length < 2) return;
      comparables++;
      const suma = posteriores.reduce((a, b) => a + b, 0);
      const ordenados = [...posteriores].sort((a, b) => b - a);
      const candidatos = [suma, suma - (ordenados[0] || 0), suma - (ordenados[0] || 0) - (ordenados[1] || 0)];
      if (candidatos.some((s) => Math.abs(s - Math.abs(total)) < 0.5)) aciertos++;
    });
    if (comparables === 0) continue;
    const ratio = aciertos / comparables;
    if (ratio > mejorAcierto && ratio > 0.6) {
      mejorAcierto = ratio;
      totalCol = c;
    }
  }

  // --- 2. Puesto: columna secuencial 1..N ---
  let puestoCol = -1;
  let mejorSecuencial = 0.6; // mínimo para confiar
  stats.forEach((s) => {
    if (s.index === totalCol) return;
    if (s.ratioSecuencial > mejorSecuencial) {
      mejorSecuencial = s.ratioSecuencial;
      puestoCol = s.index;
    }
  });

  // --- 3. Navegante: columna de texto con más palabras y más variedad
  // (nombres propios), antes de la columna de Total si la conocemos ---
  let nombreCol = -1;
  let mejorNombreScore = 0;
  stats.forEach((s) => {
    if (s.index === totalCol || s.index === puestoCol) return;
    if (totalCol !== -1 && s.index > totalCol) return; // el nombre siempre va antes del total
    if (s.textos.length < numRows * 0.5) return; // tiene que estar casi siempre lleno de texto
    const score = s.promedioPalabras * s.ratioUnicoTexto;
    if (score > mejorNombreScore) {
      mejorNombreScore = score;
      nombreCol = s.index;
    }
  });

  // --- 4. Vela: columna numérica (no puesto, no total), alta unicidad,
  // antes del total ---
  let velaCol = -1;
  let mejorVelaScore = 0;
  stats.forEach((s) => {
    if ([totalCol, puestoCol, nombreCol].includes(s.index)) return;
    if (totalCol !== -1 && s.index > totalCol) return;
    if (s.ratioNumerico < 0.7 || s.ratioLleno < 0.5) return;
    if (s.ratioUnicoNumero > mejorVelaScore) {
      mejorVelaScore = s.ratioUnicoNumero;
      velaCol = s.index;
    }
  });

  // --- 5. Club / Flota: por encabezado únicamente (son las más ambiguas
  // por forma de datos -ambas son texto corto que se repite mucho- así que
  // no vale la pena arriesgar una adivinanza estructural) ---
  const porEncabezado = detectarPorEncabezado(header);
  const clubCol = porEncabezado.clubCol !== -1 ? porEncabezado.clubCol : -1;
  const flotaCol = porEncabezado.flotaCol !== -1 ? porEncabezado.flotaCol : -1;

  // Si el encabezado no dio pistas para alguna columna, nos quedamos con lo
  // detectado por forma; si tampoco hay nada estructural, se deja sin
  // asignar (el admin la asigna a mano si hace falta).
  const asignadas = new Set([totalCol, puestoCol, nombreCol, velaCol, clubCol, flotaCol].filter((i) => i !== -1));

  // --- 6. Regatas: todas las columnas numéricas que quedan después de
  // "Total" y no fueron asignadas a otra cosa, en orden ---
  const regataIdxs = stats
    .filter((s) => s.index !== totalCol && !asignadas.has(s.index))
    .filter((s) => (totalCol === -1 ? true : s.index > totalCol))
    .filter((s) => s.ratioNumerico >= 0.4 && s.ratioLleno >= 0.1)
    .map((s) => s.index);

  const resultado: ColumnaSugerida[] = [];
  for (let c = 0; c < numCols; c++) {
    const muestra = rows.slice(0, 5).map((r) => (r[c] === null || r[c] === undefined ? '' : String(r[c])));
    let rol: RolColumna = 'ignorar';
    let numeroRegata: number | undefined;

    if (c === puestoCol) rol = 'puesto';
    else if (c === velaCol) rol = 'vela';
    else if (c === nombreCol) rol = 'navegante';
    else if (c === clubCol) rol = 'club';
    else if (c === flotaCol) rol = 'flota';
    else if (c === totalCol) rol = 'total';
    else if (regataIdxs.includes(c)) {
      rol = 'regata';
      numeroRegata = regataIdxs.indexOf(c) + 1;
    }

    resultado.push({ index: c, header: header[c] || `Columna ${c + 1}`, rol, numeroRegata, muestra });
  }

  return resultado;
}
