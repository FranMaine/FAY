import * as XLSX from 'xlsx';
import { ParseResult } from './csv-parser';

/**
 * Parses a spreadsheet (.xlsx) export of a Sailwave "Class Series Summary"
 * report into the same ParseResult[] shape produced by parseSailwaveCSV.
 *
 * Unlike the PDF export of the same report -where Sailwave renders every
 * cell with no separating whitespace and skips blank cells entirely, making
 * it impossible to reliably tell which race a value belongs to once a
 * sailor is missing a result in the middle of the row (common when the
 * event splits into Gold/Silver/Bronze fleets that don't all sail the same
 * number of races)- a spreadsheet has real cells: each race's value (or
 * blank, as null) sits in its own column regardless of neighboring gaps.
 *
 * Column layout is resolved from the header row by name rather than fixed
 * position, since the exact column order can vary between exports (e.g. a
 * "Total" column before or after "Pl"). Race columns are whichever headers
 * are plain numbers (1, 2, 3, ...), taken in that numeric order.
 */
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

  const sailCol = findCol('Sail', 'Vela', 'SailNo');
  const nombreCol = findCol('Skipper', 'Helm', 'HelmName', 'Nombre', 'Regatista');
  const clubCol = findCol('From', 'Club');
  const flotaCol = findCol('Split #4', 'Split # 4', 'Split#4', 'Split', 'Flota', 'Fleet', 'Grupo');

  if (sailCol === -1 || nombreCol === -1 || clubCol === -1) {
    throw new Error(
      'No se reconocieron las columnas del Excel. Se esperan al menos "Sail", "Skipper" y "From" (o "Vela", "Nombre" y "Club").'
    );
  }

  const raceCols = header
    .map((h, colIndex) => ({ h, colIndex }))
    .filter(({ h }) => /^\d+$/.test(h))
    .map(({ h, colIndex }) => ({ numero: parseInt(h, 10), colIndex }))
    .sort((a, b) => a.numero - b.numero);

  if (raceCols.length === 0) {
    throw new Error('No se encontraron columnas de regatas (encabezados numéricos: 1, 2, 3...) en el Excel.');
  }

  // El orden de la clasificación combinada por flotas no es "quien tiene
  // más puntos": TODA una flota (ej: Gold) va antes que la siguiente (ej:
  // Silver), aunque sus rangos de puntos se solapen -así lo arma Sailwave.
  // Como las filas ya vienen en ese orden correcto, la flota que aparece
  // primero en el archivo es la de mejor nivel; no hace falta (ni conviene)
  // asumir nombres fijos como "Gold"/"Silver"/"Bronze".
  const ordenFlota = new Map<string, number>();

  const regatistas: ParseResult[] = [];

  for (const row of rows.slice(1)) {
    const nombre = row[nombreCol];
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) continue;

    const vela = row[sailCol];
    const club = row[clubCol];

    let flota: string | undefined;
    let flotaOrden: number | undefined;
    if (flotaCol !== -1) {
      const flotaRaw = row[flotaCol];
      if (flotaRaw !== null && flotaRaw !== undefined && String(flotaRaw).trim()) {
        flota = String(flotaRaw).trim();
        if (!ordenFlota.has(flota)) ordenFlota.set(flota, ordenFlota.size);
        flotaOrden = ordenFlota.get(flota);
      }
    }

    const regatas: ParseResult['regatas'] = [];

    for (const { numero, colIndex } of raceCols) {
      const raw = row[colIndex];
      if (raw === null || raw === undefined || raw === '') continue; // no navegó esta regata

      let puntajeBruto = 0;
      let observacion: string | null = null;

      if (typeof raw === 'number') {
        // Un valor negativo marca una regata descartada por Sailwave; el
        // propio motor de puntaje (scoring.ts) recalcula sus descartes
        // desde cero, así que solo nos interesa el puntaje real.
        puntajeBruto = Math.abs(raw);
      } else {
        // Texto tipo "74 DNF" o "(74 BFD)" (descartada)
        const clean = String(raw).replace(/^\(|\)$/g, '').trim();
        const numMatch = clean.match(/\d+/);
        const charsMatch = clean.match(/[a-zA-Z]+/);
        if (numMatch && !charsMatch) {
          puntajeBruto = parseFloat(numMatch[0]);
        } else if (charsMatch) {
          observacion = charsMatch[0].toUpperCase();
          puntajeBruto = numMatch ? parseFloat(numMatch[0]) : 999;
        }
      }

      regatas.push({ numero, puntajeBruto, observacion });
    }

    regatistas.push({
      vela: vela !== null && vela !== undefined ? String(vela).trim() : '',
      nombre: nombre.trim(),
      club: club !== null && club !== undefined ? String(club).trim() : '',
      flota,
      flotaOrden,
      regatas,
    });
  }

  if (regatistas.length === 0) {
    throw new Error('No se pudo identificar regatistas en el archivo Excel.');
  }

  return regatistas;
}
