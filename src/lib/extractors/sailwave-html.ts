import * as cheerio from 'cheerio';
import { detectarPorEncabezado, type ColumnMapping, type FilaCruda } from './xlsx-parser';

// Lee la tabla general ("Overall", clase summarytable) de un reporte HTML de
// Sailwave -el archivo .htm que muchos clubes suben tal cual lo exporta el
// programa, por ejemplo los "Provisorios" del Campeonato Argentino de 420- y la
// devuelve como grilla (encabezado + filas), igual que leerGridXLSX/leerGridPDF,
// para pasar por la misma detección de columnas.
//
// Sailwave no declara la codificación en el archivo y los exporta en
// Windows-1252: si no es UTF-8 válido, se lee así (si no, las tildes y las eñes
// de los nombres quedan como "�").
function decodificar(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

const limpiar = (t: string) => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

export function leerGridSailwaveHTML(buffer: Buffer): { header: string[]; rows: FilaCruda[] } {
  const $ = cheerio.load(decodificar(buffer));
  const tabla = $('table.summarytable').first();
  if (tabla.length === 0) throw new Error('El archivo HTML no tiene una tabla de resultados de Sailwave (summarytable).');

  const header = tabla
    .find('thead tr')
    .first()
    .find('th')
    .map((_, th) => limpiar($(th).text()))
    .get();
  if (header.length === 0) throw new Error('La tabla de Sailwave no tiene encabezado.');

  const rows: FilaCruda[] = tabla
    .find('tbody tr')
    .map((_, tr) =>
      [
        $(tr)
          .find('td')
          .map((__, td) => limpiar($(td).text()))
          .get(),
      ]
    )
    .get();
  if (rows.length === 0) throw new Error('La tabla de Sailwave no tiene filas.');

  return { header, rows };
}

/**
 * Mapeo de columnas de una tabla de Sailwave, por el nombre de cada encabezado
 * (Rank, SailNo, Club, HelmName, CrewName, R1, R2..., Total, Nett). El
 * detector por forma de los datos (column-detector.ts) está pensado para
 * archivos sin nombres claros; acá los nombres son siempre los mismos, así que
 * se usan directo. null si falta una columna imprescindible.
 */
export function mapeoSailwaveHTML(header: string[]): ColumnMapping | null {
  const base = detectarPorEncabezado(header);
  const regataCols = header
    .map((h, colIndex) => ({ colIndex, m: /^R(\d+)$/i.exec(h.trim()) }))
    .filter((x): x is { colIndex: number; m: RegExpExecArray } => x.m !== null)
    .map(({ colIndex, m }) => ({ colIndex, numero: parseInt(m[1], 10) }));

  if (base.puestoCol === -1 || base.nombreCol === -1 || base.totalCol === -1 || regataCols.length === 0) return null;
  return {
    puestoCol: base.puestoCol,
    velaCol: base.velaCol,
    nombreCol: base.nombreCol,
    nombreColsExtra: base.nombreColsExtra,
    clubCol: base.clubCol,
    flotaCol: base.flotaCol === -1 ? null : base.flotaCol,
    totalCol: base.totalCol,
    regataCols,
  };
}
