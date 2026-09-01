import { describe, it, expect } from 'vitest';
import {
  calcularPuntosPenalidad,
  esPenalidad,
  aplicarDescartes,
  calcularTotalNeto,
  calcularTotalBruto,
  desempatar,
  generarClasificacion,
  type ResultadoRegata,
} from '../scoring';

describe('esPenalidad', () => {
  it('detects valid penalty codes', () => {
    expect(esPenalidad('DNF')).toBe('DNF');
    expect(esPenalidad('dsq')).toBe('DSQ');
    expect(esPenalidad('OCS')).toBe('OCS');
    expect(esPenalidad(' DNS ')).toBe('DNS');
  });

  it('returns null for non-penalty strings', () => {
    expect(esPenalidad(null)).toBeNull();
    expect(esPenalidad('')).toBeNull();
    expect(esPenalidad('normal')).toBeNull();
  });
});

describe('calcularPuntosPenalidad', () => {
  it('returns entries + 1', () => {
    expect(calcularPuntosPenalidad('DNF', 20)).toBe(21);
    expect(calcularPuntosPenalidad('DSQ', 5)).toBe(6);
  });
});

describe('aplicarDescartes', () => {
  const resultados: ResultadoRegata[] = [
    { regataNumero: 1, puesto: 3, puntos: 3, descartado: false, observacion: null },
    { regataNumero: 2, puesto: 1, puntos: 1, descartado: false, observacion: null },
    { regataNumero: 3, puesto: 5, puntos: 5, descartado: false, observacion: null },
    { regataNumero: 4, puesto: 2, puntos: 2, descartado: false, observacion: null },
    { regataNumero: 5, puesto: 8, puntos: 8, descartado: false, observacion: null },
  ];

  it('discards the worst result with 1 discard', () => {
    const result = aplicarDescartes(resultados, 1);
    expect(result[4].descartado).toBe(true); // 8 pts is worst
    expect(result.filter(r => r.descartado).length).toBe(1);
  });

  it('discards the 2 worst results with 2 discards', () => {
    const result = aplicarDescartes(resultados, 2);
    expect(result[4].descartado).toBe(true); // 8 pts
    expect(result[2].descartado).toBe(true); // 5 pts
    expect(result.filter(r => r.descartado).length).toBe(2);
  });

  it('handles 0 discards', () => {
    const result = aplicarDescartes(resultados, 0);
    expect(result.every(r => !r.descartado)).toBe(true);
  });

  it('handles discards >= results count', () => {
    const result = aplicarDescartes(resultados, 10);
    expect(result.every(r => !r.descartado)).toBe(true);
  });
});

describe('calcularTotalNeto', () => {
  it('sums only non-discarded results', () => {
    const resultados: ResultadoRegata[] = [
      { regataNumero: 1, puesto: 3, puntos: 3, descartado: false, observacion: null },
      { regataNumero: 2, puesto: 1, puntos: 1, descartado: false, observacion: null },
      { regataNumero: 3, puesto: 5, puntos: 5, descartado: true, observacion: null },
    ];
    expect(calcularTotalNeto(resultados)).toBe(4);
  });
});

describe('calcularTotalBruto', () => {
  it('sums all results', () => {
    const resultados: ResultadoRegata[] = [
      { regataNumero: 1, puesto: 3, puntos: 3, descartado: false, observacion: null },
      { regataNumero: 2, puesto: 1, puntos: 1, descartado: true, observacion: null },
    ];
    expect(calcularTotalBruto(resultados)).toBe(4);
  });
});

describe('desempatar', () => {
  it('breaks tie by most first places', () => {
    const a: ResultadoRegata[] = [
      { regataNumero: 1, puesto: 1, puntos: 1, descartado: false, observacion: null },
      { regataNumero: 2, puesto: 3, puntos: 3, descartado: false, observacion: null },
    ];
    const b: ResultadoRegata[] = [
      { regataNumero: 1, puesto: 2, puntos: 2, descartado: false, observacion: null },
      { regataNumero: 2, puesto: 2, puntos: 2, descartado: false, observacion: null },
    ];
    expect(desempatar(a, b)).toBeLessThan(0); // a wins (has a 1st)
  });

  it('returns 0 for identical results', () => {
    const a: ResultadoRegata[] = [
      { regataNumero: 1, puesto: 2, puntos: 2, descartado: false, observacion: null },
    ];
    expect(desempatar(a, a)).toBe(0);
  });
});

describe('generarClasificacion', () => {
  it('generates correct classification with discards', () => {
    const regatistas = [
      {
        regatistaId: 'r1',
        nombre: 'Juan Pérez',
        club: 'YCA',
        resultados: [
          { regataNumero: 1, puesto: 1, puntos: 1, observacion: null },
          { regataNumero: 2, puesto: 3, puntos: 3, observacion: null },
          { regataNumero: 3, puesto: 2, puntos: 2, observacion: null },
          { regataNumero: 4, puesto: 5, puntos: 5, observacion: null },
        ],
      },
      {
        regatistaId: 'r2',
        nombre: 'María García',
        club: 'CNSI',
        resultados: [
          { regataNumero: 1, puesto: 2, puntos: 2, observacion: null },
          { regataNumero: 2, puesto: 1, puntos: 1, observacion: null },
          { regataNumero: 3, puesto: 1, puntos: 1, observacion: null },
          { regataNumero: 4, puesto: 4, puntos: 4, observacion: null },
        ],
      },
    ];

    const result = generarClasificacion(regatistas, 1);

    // María: 2+1+1 = 4 neto (descarta 4)
    // Juan: 1+3+2 = 6 neto (descarta 5)
    expect(result[0].nombre).toBe('María García');
    expect(result[0].totalNeto).toBe(4);
    expect(result[0].posicionFinal).toBe(1);
    expect(result[1].nombre).toBe('Juan Pérez');
    expect(result[1].totalNeto).toBe(6);
    expect(result[1].posicionFinal).toBe(2);
  });

  it('handles penalties correctly', () => {
    const regatistas = [
      {
        regatistaId: 'r1',
        nombre: 'Test Sailor',
        club: 'TC',
        resultados: [
          { regataNumero: 1, puesto: 1, puntos: 1, observacion: null },
          { regataNumero: 2, puesto: 1, puntos: 1, observacion: null },
        ],
      },
    ];

    const result = generarClasificacion(regatistas, 0);
    expect(result[0].totalNeto).toBe(2);
  });
});
