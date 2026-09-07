import { describe, it, expect } from 'vitest';
import { numeroDeCelda, detectarPorEncabezado, armarParseResult, repararFilasDivididas, ColumnMapping } from '../xlsx-parser';

describe('numeroDeCelda', () => {
  it('extrae un número entero simple', () => {
    expect(numeroDeCelda(16)).toBe(16);
    expect(numeroDeCelda('16')).toBe(16);
  });

  it('extrae el número de un código de penalidad ("16 BFD")', () => {
    expect(numeroDeCelda('16 BFD')).toBe(16);
    expect(numeroDeCelda('(16 BFD)')).toBe(16);
  });

  it('respeta negativos', () => {
    expect(numeroDeCelda('-20')).toBe(-20);
  });

  it('devuelve null para celdas vacías o sin número', () => {
    expect(numeroDeCelda(null)).toBeNull();
    expect(numeroDeCelda(undefined)).toBeNull();
    expect(numeroDeCelda('')).toBeNull();
    expect(numeroDeCelda('DNF')).toBeNull();
  });
});

describe('detectarPorEncabezado', () => {
  it('reconoce variantes comunes de cada columna', () => {
    const header = ['Pl.', 'Sail #', 'Skipper', 'Subgroup division', 'Club', 'Tot.', 'R1', 'R2'];
    const detectado = detectarPorEncabezado(header);
    expect(detectado.puestoCol).toBe(0);
    expect(detectado.velaCol).toBe(1);
    expect(detectado.nombreCol).toBe(2);
    expect(detectado.flotaCol).toBe(3);
    expect(detectado.clubCol).toBe(4);
    expect(detectado.totalCol).toBe(5);
  });

  it('reconoce "Rank" como puesto y "Timonel" como nombre', () => {
    const header = ['Rank', 'Pais', 'Vela', 'Timonel', 'Club'];
    const detectado = detectarPorEncabezado(header);
    expect(detectado.puestoCol).toBe(0);
    expect(detectado.nombreCol).toBe(3);
  });

  it('junta HelmName + CrewName como nombreCol + nombreColsExtra', () => {
    const header = ['Rank', 'Vela', 'CLUB', 'HelmName', 'CrewName', 'R1'];
    const detectado = detectarPorEncabezado(header);
    expect(detectado.nombreCol).toBe(3);
    expect(detectado.nombreColsExtra).toEqual([4]);
  });

  it('no agrega nombreColsExtra si el nombre ya viene combinado en una sola columna ("Crew")', () => {
    const header = ['Pl', 'Sail', 'Crew', 'From', 'Tot'];
    const detectado = detectarPorEncabezado(header);
    expect(detectado.nombreCol).toBe(2);
    expect(detectado.nombreColsExtra).toEqual([]);
  });

  it('devuelve -1 para columnas que no reconoce', () => {
    const header = ['Columna A', 'Columna B'];
    const detectado = detectarPorEncabezado(header);
    expect(detectado.puestoCol).toBe(-1);
    expect(detectado.clubCol).toBe(-1);
  });
});

describe('repararFilasDivididas', () => {
  it('no cambia nada en un archivo bien formado (una fila = un resultado)', () => {
    const rows = [
      [1, 101, 'Juan Perez', 'CUBA', 5],
      [2, 102, 'Ana Diaz', 'CVB', 9],
    ];
    expect(repararFilasDivididas(rows)).toEqual(rows);
  });

  it('junta una fila de datos con el puesto que quedó suelto en la fila siguiente', () => {
    const rows = [
      [null, 3, 'Felix Llauro & Lucas Cozar', 'YCA', 13],
      [1, null, null, null, null],
      [null, 9, 'Olivia Riesgo & Agustina Arguelles', 'YCA', 24],
      [2, null, null, null, null],
    ];
    expect(repararFilasDivididas(rows)).toEqual([
      [1, 3, 'Felix Llauro & Lucas Cozar', 'YCA', 13],
      [2, 9, 'Olivia Riesgo & Agustina Arguelles', 'YCA', 24],
    ]);
  });

  it('descarta filas separadoras en blanco', () => {
    const rows = [
      [1, 101, 'Juan Perez', 'CUBA', 5],
      [null, null, null, null, null],
      [2, 102, 'Ana Diaz', 'CVB', 9],
    ];
    expect(repararFilasDivididas(rows)).toEqual([
      [1, 101, 'Juan Perez', 'CUBA', 5],
      [2, 102, 'Ana Diaz', 'CVB', 9],
    ]);
  });

  it('tolera una fila en blanco entre la fila de datos y el puesto suelto', () => {
    const rows = [
      [null, 3, 'Felix Llauro & Lucas Cozar', 'YCA', 13],
      [null, null, null, null, null],
      [1, null, null, null, null],
    ];
    expect(repararFilasDivididas(rows)).toEqual([
      [1, 3, 'Felix Llauro & Lucas Cozar', 'YCA', 13],
    ]);
  });
});

describe('armarParseResult', () => {
  const header = ['puesto', 'vela', 'navegante', 'club', 'total', 'r1', 'r2'];
  const baseMapping: ColumnMapping = {
    puestoCol: 0,
    velaCol: 1,
    nombreCol: 2,
    clubCol: 3,
    flotaCol: null,
    totalCol: 4,
    regataCols: [{ colIndex: 5, numero: 1 }, { colIndex: 6, numero: 2 }],
  };

  it('arma un regatista por fila con sus regatas', () => {
    const rows = [
      [1, 101, 'Juan Perez', 'CUBA', 5, 2, 3],
      [2, 102, 'Ana Diaz', 'CVB', 9, 4, 5],
    ];
    const resultado = armarParseResult(header, rows, baseMapping);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({
      nombre: 'Juan Perez',
      club: 'CUBA',
      vela: '101',
      puestoOficial: 1,
      totalOficial: 5,
    });
    expect(resultado[0].regatas).toEqual([
      { numero: 1, puntajeBruto: 2, observacion: null },
      { numero: 2, puntajeBruto: 3, observacion: null },
    ]);
  });

  it('salta filas sin nombre', () => {
    const rows = [[1, 101, '', 'CUBA', 5, 2, 3]];
    expect(() => armarParseResult(header, rows, baseMapping)).toThrow();
  });

  it('no cuenta una regata cuando la celda está vacía (no navegó esa regata)', () => {
    const rows = [[1, 101, 'Juan Perez', 'CUBA', 5, null, 3]];
    const resultado = armarParseResult(header, rows, baseMapping);
    expect(resultado[0].regatas).toEqual([{ numero: 2, puntajeBruto: 3, observacion: null }]);
  });

  it('junta navegante+navegantesExtra con " & " cuando vienen en columnas separadas', () => {
    const headerConCrew = ['puesto', 'vela', 'skipper', 'crew', 'club', 'total', 'r1'];
    const mapping: ColumnMapping = {
      ...baseMapping,
      nombreCol: 2,
      nombreColsExtra: [3],
      clubCol: 4,
      totalCol: 5,
      regataCols: [{ colIndex: 6, numero: 1 }],
    };
    const rows = [[1, 101, 'Juan Perez', 'Ana Diaz', 'CUBA', 5, 2]];
    const resultado = armarParseResult(headerConCrew, rows, mapping);
    expect(resultado[0].nombre).toBe('Juan Perez & Ana Diaz');
  });

  it('arma clubesPorColumna cuando hay columnas de club adicionales', () => {
    const headerConClub2 = ['puesto', 'vela', 'navegante', 'club', 'club2', 'total', 'r1'];
    const mapping: ColumnMapping = {
      ...baseMapping,
      clubCol: 3,
      clubColsExtra: [4],
      totalCol: 5,
      regataCols: [{ colIndex: 6, numero: 1 }],
    };
    const rows = [[1, 101, 'Juan Perez & Ana Diaz', 'CUBA', 'CVB', 5, 2]];
    const resultado = armarParseResult(headerConClub2, rows, mapping);
    expect(resultado[0].clubesPorColumna).toEqual(['CUBA', 'CVB']);
  });

  it('guarda columnas personalizadas en datosExtra', () => {
    const headerConExtra = ['puesto', 'vela', 'navegante', 'club', 'total', 'r1', 'categoria'];
    const mapping: ColumnMapping = {
      ...baseMapping,
      regataCols: [{ colIndex: 5, numero: 1 }],
      columnasPersonalizadas: [{ colIndex: 6, nombre: 'Categoría' }],
    };
    const rows = [[1, 101, 'Juan Perez', 'CUBA', 5, 2, 'Sub15']];
    const resultado = armarParseResult(headerConExtra, rows, mapping);
    expect(resultado[0].datosExtra).toEqual({ Categoría: 'Sub15' });
  });
});
