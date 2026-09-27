import { describe, it, expect } from 'vitest';
import { sonNombresParecidos } from '../regatista-merge';

describe('sonNombresParecidos', () => {
  it('detecta cuando a un nombre le falta una palabra (ej: falta un segundo nombre)', () => {
    expect(sonNombresParecidos('Sofía Mainero', 'Sofía Valentina Mainero')).toBe(true);
  });

  it('detecta una palabra mal tipeada (distancia de edición 1)', () => {
    expect(sonNombresParecidos('Sofía Mainero', 'Sofía Maynero')).toBe(true);
  });

  it('no marca como parecidas a dos personas distintas que solo comparten apellido', () => {
    expect(sonNombresParecidos('Juan Perez', 'Pedro Perez')).toBe(false);
  });

  it('no marca como parecidas a dos personas distintas que solo comparten nombre de pila', () => {
    expect(sonNombresParecidos('Juan Perez', 'Juan Gomez')).toBe(false);
  });

  it('ignora mayúsculas, acentos y el orden de las palabras', () => {
    expect(sonNombresParecidos('mainero sofia', 'Sofía Valentina MAINERO')).toBe(true);
  });

  it('no marca como parecidos a nombres idénticos (ya los cubre el grupo de nombre idéntico)', () => {
    expect(sonNombresParecidos('Sofía Mainero', 'Sofia Mainero')).toBe(false);
  });

  it('no se aplica a nombres de una sola palabra (eso lo cubre "apellido suelto")', () => {
    expect(sonNombresParecidos('Mainero', 'Sofía Mainero')).toBe(false);
    expect(sonNombresParecidos('Mainero', 'Maynero')).toBe(false);
  });

  it('no marca como parecidos a nombres sin ninguna palabra en común', () => {
    expect(sonNombresParecidos('Ana Diaz', 'Beto Lopez')).toBe(false);
  });

  it('acepta hasta una palabra de diferencia sumando ambos lados, no dos', () => {
    // "Ana Maria Diaz" vs "Ana Diaz Gomez": comparten "Ana" y "Diaz", a cada
    // una le sobra una palabra propia (Maria / Gomez) -> suma 2, no cuela.
    expect(sonNombresParecidos('Ana Maria Diaz', 'Ana Diaz Gomez')).toBe(false);
  });
});
