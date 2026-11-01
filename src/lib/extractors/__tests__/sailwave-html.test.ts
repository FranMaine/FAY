import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerGridSailwaveHTML, mapeoSailwaveHTML } from '../sailwave-html';
import { armarParseResult } from '../xlsx-parser';
import { inferirDescartes, validarResultados } from '../../barlovento';

// Provisorios del primer día del Campeonato Argentino de 420 2026 (31 de
// octubre), tal cual los publicó Barlovento: HTML de Sailwave en Windows-1252.
const archivo = readFileSync(join(__dirname, '../../__tests__/fixtures/barlovento-provisorios-20261031.htm'));

describe('leerGridSailwaveHTML', () => {
  const { header, rows } = leerGridSailwaveHTML(archivo);

  it('lee el encabezado y las 31 filas', () => {
    expect(header).toEqual(['Rank', 'BowNumber', 'Boat', 'Class', 'SailNo', 'Club', 'HelmName', 'CrewName', 'R1', 'R2', 'R3', 'R4', 'Total', 'Nett']);
    expect(rows).toHaveLength(31);
    expect(rows[0].slice(0, 2)).toEqual(['1st', '01']);
  });

  it('conserva las tildes (Windows-1252)', () => {
    const nombres = rows.map((r) => String(r[6]));
    expect(nombres).toContain('Claire López Tilli');
    expect(nombres).toContain('Iñaki Caviglia');
  });

  it('conserva los códigos de penalidad', () => {
    expect(rows.map((r) => r[11])).toContain('32.0 BFD');
  });

  it('se mapea por el nombre de las columnas y se importa sin problemas', () => {
    const mapeo = mapeoSailwaveHTML(header);
    expect(mapeo).not.toBeNull();
    const filas = armarParseResult(header, rows, mapeo!);
    expect(filas).toHaveLength(31);
    expect(filas[0]).toMatchObject({ nombre: expect.stringContaining('Federico Warburg'), puestoOficial: 1, totalOficial: 11 });
    expect(filas[0].regatas).toHaveLength(4);
    expect(validarResultados(filas)).toEqual([]);
    expect(inferirDescartes(filas)).toBe(0);
    const bfd = filas.find((f) => f.nombre.includes('Torino'));
    expect(bfd?.regatas[3]).toMatchObject({ puntajeBruto: 32, observacion: 'BFD' });
  });
});
