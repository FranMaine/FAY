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

export function parseSailwaveXLSX(buffer: Buffer): ParseResult[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  if (rows.length < 2) {
    throw new Error('El archivo Excel no tiene filas de datos.');
  }

  const header = rows[0].map((h) => (h === null || h === undefined ? '' : String(h).trim()));
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const puestoCol = findCol('puesto', 'pl', 'pl.');
  const velaCol = findCol('vela', 'sail');
  const nombreCol = findCol('navegante', 'skipper', 'nombre', 'crew', 'helm', 'helmname');
  const flotaCol = findCol('Subgroup division', 'subgroup division', 'subgroup', 'flota', 'split', 'split #4');
  const clubCol = findCol('club', 'from');
  const totalCol = findCol('Total puntos', 'total puntos', 'total', 'tot', 'tot.');

  if (puestoCol === -1 || velaCol === -1 || nombreCol === -1 || clubCol === -1 || totalCol === -1) {
    throw new Error(
      'El Excel no tiene las columnas esperadas. Deben ser, en este orden: puesto, vela, navegante, Subgroup division, club, Total puntos, regata 1, regata 2...'
    );
  }

  const raceCols = header
    .map((h, colIndex) => ({ h, colIndex }))
    .filter(({ h, colIndex }) => colIndex > totalCol && h.length > 0)
    .map(({ h, colIndex }, i) => ({ numero: i + 1, colIndex, etiqueta: h }));

  if (raceCols.length === 0) {
    throw new Error('No se encontraron columnas de regatas después de "Total puntos" (ej: "regata 1", "regata 2"...).');
  }

  const numero = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    const match = String(v).match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const regatistas: ParseResult[] = [];

  for (const row of rows.slice(1)) {
    const nombre = row[nombreCol];
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) continue;

    const puestoOficial = numero(row[puestoCol]);
    const totalOficial = numero(row[totalCol]);
    const vela = row[velaCol];
    const club = row[clubCol];
    const flotaRaw = flotaCol !== -1 ? row[flotaCol] : null;
    const flota = flotaRaw !== null && flotaRaw !== undefined && String(flotaRaw).trim() ? String(flotaRaw).trim() : undefined;

    const regatas: ParseResult['regatas'] = [];
    for (const { numero: numeroRegata, colIndex } of raceCols) {
      const valor = numero(row[colIndex]);
      if (valor === null) continue; // celda vacía: no navegó esta regata
      regatas.push({ numero: numeroRegata, puntajeBruto: Math.abs(valor), observacion: null });
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
