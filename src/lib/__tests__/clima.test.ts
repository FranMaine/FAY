import { describe, it, expect } from 'vitest';
import { categoriaClima, direccionViento, intensidadViento } from '../clima';

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

describe('intensidadViento', () => {
  it('clasifica los nudos de calma a muy fuerte', () => {
    expect(intensidadViento(0).etiqueta).toBe('Calma');
    expect(intensidadViento(5.9).etiqueta).toBe('Calma');
    expect(intensidadViento(6).etiqueta).toBe('Suave');
    expect(intensidadViento(12).etiqueta).toBe('Moderado');
    expect(intensidadViento(18).etiqueta).toBe('Fuerte');
    expect(intensidadViento(25).etiqueta).toBe('Muy fuerte');
    expect(intensidadViento(40).etiqueta).toBe('Muy fuerte');
  });

  it('devuelve una clase de fondo distinta por nivel', () => {
    const fondos = [0, 6, 12, 18, 25].map((n) => intensidadViento(n).fondo);
    expect(new Set(fondos).size).toBe(5);
  });
});
