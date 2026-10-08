import { describe, it, expect } from 'vitest';
import { categoriaClima, direccionViento, vientoDesdeMetar } from '../clima';

describe('categoriaClima', () => {
  it('agrupa los códigos WMO en categorías', () => {
    expect(categoriaClima(0)).toBe('despejado');
    expect(categoriaClima(2)).toBe('nublado');
    expect(categoriaClima(45)).toBe('niebla');
    expect(categoriaClima(63)).toBe('lluvia');
    expect(categoriaClima(73)).toBe('nieve');
    expect(categoriaClima(95)).toBe('tormenta');
  });
});

describe('direccionViento', () => {
  it('convierte grados a punto cardinal', () => {
    expect(direccionViento(0)).toBe('N');
    expect(direccionViento(90)).toBe('E');
    expect(direccionViento(225)).toBe('SO');
    expect(direccionViento(359)).toBe('N');
  });
});

describe('vientoDesdeMetar', () => {
  const ahora = new Date('2026-10-08T02:30:00.000Z');

  it('toma el viento del reporte más reciente', () => {
    const resultado = vientoDesdeMetar(
      [{ reportTime: '2026-10-08T02:00:00.000Z', wspd: 5, wdir: 320 }],
      ahora
    );
    expect(resultado).toEqual({ vientoNudos: 5, vientoGrados: 320 });
  });

  it('devuelve null si no hay reportes', () => {
    expect(vientoDesdeMetar([], ahora)).toBeNull();
    expect(vientoDesdeMetar(null, ahora)).toBeNull();
  });

  it('devuelve null con viento variable (VRB), sin dirección confiable', () => {
    const resultado = vientoDesdeMetar(
      [{ reportTime: '2026-10-08T02:00:00.000Z', wspd: 2, wdir: 'VRB' }],
      ahora
    );
    expect(resultado).toBeNull();
  });

  it('devuelve null si el reporte es demasiado viejo (la estación no reportó hace rato)', () => {
    const resultado = vientoDesdeMetar(
      [{ reportTime: '2026-10-08T00:00:00.000Z', wspd: 5, wdir: 320 }],
      ahora
    );
    expect(resultado).toBeNull();
  });
});
