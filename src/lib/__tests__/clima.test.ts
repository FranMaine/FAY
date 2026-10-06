import { describe, it, expect } from 'vitest';
import { categoriaClima, direccionViento } from '../clima';

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
