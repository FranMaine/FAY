import * as XLSX from 'xlsx';
import { ParseResult } from './csv-parser';

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
  nombreCol: number;
  clubCol: number;
  flotaCol: number | null;
  totalCol: number;
  // Cada columna de regata, en el orden en que deben numerarse (no
  // necesariamente el orden del archivo, aunque normalmente coincide).
  regataCols: { colIndex: number; numero: number }[];
}

/** Extrae el primer número de una celda ("(16 BFD)" -> 16, "-20" -> -20). */
export function numeroDeCelda(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const match = String(v).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/** Lee un .xlsx a una grilla cruda: encabezado + filas de datos. */
export function leerGridXLSX(buffer: Buffer): { header: string[]; rows: any[][] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  if (rows.length < 2) {
    throw new Error('El archivo Excel no tiene filas de datos.');
  }

  const header = rows[0].map((h) => (h === null || h === undefined ? '' : String(h).trim()));
  return { header, rows: rows.slice(1) };
}

// Comparamos ignorando may/min y cualquier caracter que no sea letra o
// número -así "Sail #", "Sail#" y "sail" son todos la misma columna, en
// vez de exigir que el encabezado coincida carácter por carácter con
// alguno de nuestros nombres esperados.
const normalizar = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function buscarPorNombre(header: string[], ...names: string[]): number {
  const normalizados = names.map(normalizar);
  return header.findIndex((h) => normalizados.includes(normalizar(h)));
}

/** Matchea columnas por el texto del encabezado. -1 cuando no encuentra. */
export function detectarPorEncabezado(header: string[]) {
  return {
    puestoCol: buscarPorNombre(header, 'puesto', 'pl', 'pl.'),
    velaCol: buscarPorNombre(header, 'vela', 'sail', 'sailno', 'sailnumber', 'nrovela'),
    nombreCol: buscarPorNombre(header, 'navegante', 'skipper', 'nombre', 'crew', 'helm', 'helmname'),
    flotaCol: buscarPorNombre(header, 'Subgroup division', 'subgroup division', 'subgroup', 'flota', 'split', 'split #4'),
    clubCol: buscarPorNombre(header, 'club', 'from'),
    totalCol: buscarPorNombre(header, 'Total puntos', 'total puntos', 'total', 'tot', 'tot.'),
  };
}

/** Arma el ParseResult[] de un grid ya leído, dado un mapeo de columnas confirmado. */
export function armarParseResult(header: string[], rows: any[][], mapping: ColumnMapping): ParseResult[] {
  const { puestoCol, velaCol, nombreCol, clubCol, flotaCol, totalCol, regataCols } = mapping;

  const regatistas: ParseResult[] = [];

  for (const row of rows) {
    const nombre = row[nombreCol];
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) continue;

    const puestoOficial = numeroDeCelda(row[puestoCol]);
    const totalOficial = numeroDeCelda(row[totalCol]);
    const vela = row[velaCol];
    const club = row[clubCol];
    const flotaRaw = flotaCol !== null ? row[flotaCol] : null;
    const flota = flotaRaw !== null && flotaRaw !== undefined && String(flotaRaw).trim() ? String(flotaRaw).trim() : undefined;

    const regatas: ParseResult['regatas'] = [];
    for (const { numero, colIndex } of regataCols) {
      const valor = numeroDeCelda(row[colIndex]);
      if (valor === null) continue; // celda vacía: no navegó esta regata
      regatas.push({ numero, puntajeBruto: Math.abs(valor), observacion: null });
    }

    regatistas.push({
      vela: vela !== null && vela !== undefined ? String(vela).trim() : '',
      nombre: nombre.trim(),
      club: club !== null && club !== undefined ? String(club).trim() : '',
      flota,
      puestoOficial: puestoOficial !== null ? Math.round(puestoOficial) : undefined,
      totalOficial: totalOficial !== null ? totalOficial : undefined,
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
