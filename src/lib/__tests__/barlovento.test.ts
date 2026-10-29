import { describe, it, expect } from 'vitest';
import {
  buscarArchivosDeResultados,
  dentroDeVentana,
  elegirArchivoGeneral,
  inferirDescartes,
  mapeoDesdeSugerencias,
  validarResultados,
} from '../barlovento';
import type { ParseResult } from '../extractors/csv-parser';
import type { ColumnaSugerida } from '../extractors/column-detector';

// 14:00 de Argentina es 17:00 UTC.
const ar = (iso: string) => new Date(`${iso}-03:00`);

describe('dentroDeVentana', () => {
  it('abre a las 14 h de Argentina en un día de regata', () => {
    expect(dentroDeVentana(ar('2026-10-31T13:59:00'))).toBe(false);
    expect(dentroDeVentana(ar('2026-10-31T14:00:00'))).toBe(true);
    expect(dentroDeVentana(ar('2026-11-01T23:50:00'))).toBe(true);
  });

  it('sigue abierta pasada la medianoche UTC (todavía es de noche en Argentina)', () => {
    expect(dentroDeVentana(new Date('2026-11-01T01:30:00Z'))).toBe(true); // 22:30 del 31/10 en Argentina
  });

  it('está cerrada los días sin regata y en otros años', () => {
    expect(dentroDeVentana(ar('2026-11-02T15:00:00'))).toBe(false);
    expect(dentroDeVentana(ar('2026-11-07T15:00:00'))).toBe(true);
    expect(dentroDeVentana(ar('2026-11-08T15:00:00'))).toBe(true);
    expect(dentroDeVentana(ar('2027-10-31T15:00:00'))).toBe(false);
  });
});

const HTML = `
  <a href="http://barlovento.org.ar/wp-content/uploads/2026/10/AvR_ARG4202026_02-1.pdf">Aviso de Regata</a>
  <a href="http://barlovento.org.ar/wp-content/uploads/2026/10/IR-ARG420-2026-05.pdf">Instrucciones de Regata</a>
  <a href="/wp-content/uploads/2026/11/Resultados-General-420.pdf">Resultados</a>
  <a href="https://www.manage2sail.com/es-AR/event/abc/results">Resultados en vivo</a>
  <a href="/contacto/">Contacto</a>`;

describe('buscarArchivosDeResultados', () => {
  it('encuentra el archivo de resultados y deja afuera aviso e instrucciones', () => {
    const { archivos, externos } = buscarArchivosDeResultados(HTML);
    expect(archivos.map((a) => a.url)).toEqual(['https://barlovento.org.ar/wp-content/uploads/2026/11/Resultados-General-420.pdf']);
    expect(externos).toEqual(['https://www.manage2sail.com/es-AR/event/abc/results']);
  });

  it('no devuelve nada si todavía no hay resultados', () => {
    const sinResultados = HTML.split('\n').filter((l) => !/Resultados/.test(l)).join('\n');
    expect(buscarArchivosDeResultados(sinResultados)).toEqual({ archivos: [], externos: [] });
  });

  it('no repite un mismo enlace', () => {
    const doble = `${HTML}<a href="/wp-content/uploads/2026/11/Resultados-General-420.pdf">Resultados</a>`;
    expect(buscarArchivosDeResultados(doble).archivos).toHaveLength(1);
  });
});

describe('elegirArchivoGeneral', () => {
  const a = (url: string) => ({ url, texto: '' });
  it('usa el único archivo que haya', () => {
    expect(elegirArchivoGeneral([a('https://x/res.pdf')])?.url).toBe('https://x/res.pdf');
  });
  it('entre varios, elige el general', () => {
    expect(elegirArchivoGeneral([a('https://x/regata-1.pdf'), a('https://x/resultados-general.pdf')])?.url).toBe('https://x/resultados-general.pdf');
  });
  it('si no se puede decidir, devuelve null', () => {
    expect(elegirArchivoGeneral([a('https://x/regata-1.pdf'), a('https://x/regata-2.pdf')])).toBeNull();
  });
});

const col = (index: number, rol: ColumnaSugerida['rol'], numeroRegata?: number): ColumnaSugerida => ({
  index,
  header: '',
  rol,
  numeroRegata,
  muestra: [],
});

describe('mapeoDesdeSugerencias', () => {
  it('arma el mapeo con timonel y tripulante en columnas separadas', () => {
    const m = mapeoDesdeSugerencias([
      col(0, 'puesto'), col(1, 'vela'), col(2, 'navegante'), col(3, 'navegante'), col(4, 'club'),
      col(5, 'regata', 1), col(6, 'regata', 2), col(7, 'total'),
    ]);
    expect(m).toMatchObject({ puestoCol: 0, velaCol: 1, nombreCol: 2, nombreColsExtra: [3], clubCol: 4, totalCol: 7, flotaCol: null });
    expect(m?.regataCols).toEqual([{ colIndex: 5, numero: 1 }, { colIndex: 6, numero: 2 }]);
  });

  it('devuelve null si falta algo imprescindible', () => {
    expect(mapeoDesdeSugerencias([col(0, 'puesto'), col(1, 'navegante'), col(2, 'regata', 1)])).toBeNull();
    expect(mapeoDesdeSugerencias([col(0, 'puesto'), col(1, 'navegante'), col(2, 'total')])).toBeNull();
  });
});

function fila(nombre: string, puntos: number[], total: number, puesto: number, codigos: (string | null)[] = []): ParseResult {
  return {
    vela: '1', nombre, club: 'X', puestoOficial: puesto, totalOficial: total,
    regatas: puntos.map((p, i) => ({ numero: i + 1, puntajeBruto: p, observacion: codigos[i] ?? null })),
  };
}

describe('inferirDescartes', () => {
  it('encuentra la cantidad de descartes con la que cierran los totales', () => {
    const filas = [fila('A', [1, 2, 9], 3, 1), fila('B', [2, 1, 7], 3, 2), fila('C', [3, 3, 3], 6, 3)];
    // Con 1 descarte: A = 1+2 = 3, B = 2+1 = 3, C = 3+3 = 6.
    expect(inferirDescartes(filas)).toBe(1);
  });

  it('sin descartes cuando el total es la suma de todo', () => {
    expect(inferirDescartes([fila('A', [1, 2], 3, 1), fila('B', [2, 1], 3, 2), fila('C', [3, 3], 6, 3)])).toBe(0);
  });

  it('un DNE no se descarta', () => {
    const filas = [fila('A', [1, 9], 10, 1, [null, 'DNE']), fila('B', [2, 1], 3, 2), fila('C', [3, 3], 6, 3)];
    expect(inferirDescartes(filas)).toBe(0);
  });

  it('null si ninguna cantidad cierra', () => {
    expect(inferirDescartes([fila('A', [1, 2], 99, 1)])).toBeNull();
  });
});

describe('validarResultados', () => {
  it('acepta una tabla razonable', () => {
    const filas = [fila('A', [1, 2], 3, 1), fila('B', [2, 1], 3, 2), fila('C', [3, 3], 6, 3)];
    expect(validarResultados(filas)).toEqual([]);
  });

  it('rechaza pocas filas, filas sin regatas y puestos incoherentes', () => {
    expect(validarResultados([fila('A', [1], 1, 1)]).join()).toContain('Solo se leyeron 1');
    const sinRegatas = [fila('A', [], 0, 1), fila('B', [], 0, 2), fila('C', [], 0, 3)];
    expect(validarResultados(sinRegatas).join()).toContain('sin ninguna regata');
    const sinPrimero = [fila('A', [1], 1, 2), fila('B', [2], 2, 3), fila('C', [3], 3, 4)];
    expect(validarResultados(sinPrimero).join()).toContain('puesto 1');
  });
});
