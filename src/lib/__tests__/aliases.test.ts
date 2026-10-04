import { describe, it, expect } from 'vitest';
import { mapaConAliases } from '../aliases';

describe('mapaConAliases', () => {
  const entidades = [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Bruno' }];
  const claveDe = (e: { nombre: string }) => e.nombre.toLowerCase();

  it('incluye las entidades vivas por su clave', () => {
    const mapa = mapaConAliases(entidades, [], claveDe);
    expect(mapa.get('ana')?.id).toBe('a');
    expect(mapa.get('bruno')?.id).toBe('b');
  });

  it('suma los aliases apuntando a la entidad conservada', () => {
    const mapa = mapaConAliases(entidades, [{ clave: 'anita', entidadId: 'a' }], claveDe);
    expect(mapa.get('anita')?.id).toBe('a');
  });

  it('una entidad viva gana sobre un alias con la misma clave', () => {
    const mapa = mapaConAliases(entidades, [{ clave: 'ana', entidadId: 'b' }], claveDe);
    expect(mapa.get('ana')?.id).toBe('a');
  });

  it('ignora aliases cuya entidad ya no existe', () => {
    const mapa = mapaConAliases(entidades, [{ clave: 'fantasma', entidadId: 'zzz' }], claveDe);
    expect(mapa.has('fantasma')).toBe(false);
  });
});
