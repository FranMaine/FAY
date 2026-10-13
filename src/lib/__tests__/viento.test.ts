import { describe, it, expect } from 'vitest';
import { estaDesactualizada, type LecturaViento } from '../viento';

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
