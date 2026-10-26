import { describe, it, expect } from 'vitest';
import { estaDesactualizada, vientoActual, type LecturaViento } from '../viento';

const lectura = (iso: string): LecturaViento => ({ hora: new Date(iso), nudos: 10, rafaga: null, grados: 120 });
const ahora = new Date('2026-10-13T20:00:00.000Z').getTime();

describe('estaDesactualizada', () => {
  it('false con una lectura reciente', () => {
    expect(estaDesactualizada(lectura('2026-10-13T19:00:00.000Z'), ahora)).toBe(false);
  });

  it('true si la última lectura tiene más de 3 horas', () => {
    expect(estaDesactualizada(lectura('2026-10-13T16:30:00.000Z'), ahora)).toBe(true);
  });

  it('false si no hay lectura (ese caso se muestra aparte)', () => {
    expect(estaDesactualizada(null, ahora)).toBe(false);
  });
});

describe('vientoActual', () => {
  const l = (iso: string, nudos: number, grados: number | null): LecturaViento => ({ hora: new Date(iso), nudos, rafaga: null, grados });

  it('toma la última lectura (el historial viene de la más vieja a la más nueva)', () => {
    const r = vientoActual([l('2026-10-13T17:00:00.000Z', 4, 20), l('2026-10-13T18:00:00.000Z', 8.6, 90)], ahora);
    expect(r).toEqual({ nudos: 9, grados: 90 });
  });

  it('sigue usando una lectura de hace 2 horas: es la misma que muestra la página', () => {
    expect(vientoActual([l('2026-10-13T18:00:00.000Z', 9, 90)], ahora)).toEqual({ nudos: 9, grados: 90 });
  });

  it('null si la estación lleva más de 3 horas sin reportar', () => {
    expect(vientoActual([l('2026-10-13T16:00:00.000Z', 9, 90)], ahora)).toBeNull();
  });

  it('null si no hay lecturas', () => {
    expect(vientoActual([], ahora)).toBeNull();
  });

  it('con viento variable devuelve la velocidad y grados null (el llamador usa otra dirección)', () => {
    expect(vientoActual([l('2026-10-13T19:30:00.000Z', 3, null)], ahora)).toEqual({ nudos: 3, grados: null });
  });
});
