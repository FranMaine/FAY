import { describe, it, expect } from 'vitest';
import { coincidePorPalabras, normalizarBusqueda, palabrasDeBusqueda, patronSinTildes } from '../busqueda-texto';

describe('busqueda', () => {
  it('normaliza mayúsculas y tildes', () => {
    expect(normalizarBusqueda('  María ÁÉÍÓÚ Ñandú ')).toBe('maria aeiou nandu');
  });

  it('separa en palabras (espacios, comas, varios espacios)', () => {
    expect(palabrasDeBusqueda('  Maine,  MARÍA ')).toEqual(['maine', 'maria']);
    expect(palabrasDeBusqueda('   ')).toEqual([]);
  });

  it('no distingue el orden de las palabras', () => {
    expect(coincidePorPalabras('María Maine', 'maine maria')).toBe(true);
    expect(coincidePorPalabras('Maine, María', 'MARIA MAINE')).toBe(true);
  });

  it('no distingue tildes ni mayúsculas, escritas de cualquier lado', () => {
    expect(coincidePorPalabras('María', 'maria')).toBe(true);
    expect(coincidePorPalabras('Maria', 'María')).toBe(true);
    expect(coincidePorPalabras('JOSÉ PEÑA', 'jose pena')).toBe(true);
  });

  it('exige todas las palabras y acepta fragmentos', () => {
    expect(coincidePorPalabras('María Maine', 'mar mai')).toBe(true);
    expect(coincidePorPalabras('María Maine', 'maria perez')).toBe(false);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(coincidePorPalabras('Cualquiera', '  ')).toBe(true);
  });

  describe('patronSinTildes (el que usa Postgres)', () => {
    const coincide = (palabra: string, texto: string) => new RegExp(patronSinTildes(palabra), 'i').test(texto);

    it('encuentra la palabra con o sin tilde en la base', () => {
      expect(coincide('maria', 'María Maine')).toBe(true);
      expect(coincide('María', 'Maria Maine')).toBe(true);
      expect(coincide('pena', 'JOSÉ PEÑA')).toBe(true);
      expect(coincide('nu', 'Muñoz')).toBe(false);
    });

    it('escapa los caracteres especiales de regex', () => {
      expect(coincide('a.b', 'axb')).toBe(false);
      expect(coincide('a.b', 'a.b')).toBe(true);
      expect(() => new RegExp(patronSinTildes('((['), 'i')).not.toThrow();
    });
  });
});
