import { describe, it, expect } from 'vitest';
import { LUGARES, LUGAR_DE_CLUB, LUGAR_PREDETERMINADO, lugarPorSlug, lugarDeClub, urlViento, distanciaKm } from '../lugares';

describe('catálogo de lugares', () => {
  it('los slugs son únicos', () => {
    expect(new Set(LUGARES.map((l) => l.slug)).size).toBe(LUGARES.length);
  });

  it('el predeterminado es San Isidro y tiene estación de medición', () => {
    expect(LUGAR_PREDETERMINADO.slug).toBe('san-isidro');
    expect(LUGAR_PREDETERMINADO.estacion?.id).toBe('SADF');
  });

  it('toda estación está a una distancia razonable (<= 25 km) de su lugar', () => {
    for (const l of LUGARES) {
      if (!l.estacion) continue;
      const km = distanciaKm(l.latitud, l.longitud, l.estacion.latitud, l.estacion.longitud);
      expect(km, `${l.slug} -> ${l.estacion.id}`).toBeLessThanOrEqual(25);
    }
  });

  it('todo club mapeado apunta a un lugar que existe', () => {
    for (const [club, slug] of Object.entries(LUGAR_DE_CLUB)) {
      expect(lugarPorSlug(slug), `${club} -> ${slug}`).not.toBeNull();
    }
  });

  it('las siglas del mapa están en mayúsculas (así se guardan en Club.nombre)', () => {
    for (const club of Object.keys(LUGAR_DE_CLUB)) expect(club).toBe(club.toUpperCase());
  });
});

describe('lugarDeClub', () => {
  it('devuelve el lugar del club conocido', () => {
    expect(lugarDeClub('YCR').slug).toBe('rosario');
    expect(lugarDeClub('CNMP').slug).toBe('mar-del-plata');
    expect(lugarDeClub('CNSI').slug).toBe('san-isidro');
  });

  it('ignora mayúsculas y espacios de más', () => {
    expect(lugarDeClub('  ycr ').slug).toBe('rosario');
  });

  it('cae en el predeterminado si el club no se conoce, no hay club o es del exterior', () => {
    expect(lugarDeClub('CLUB INVENTADO').slug).toBe(LUGAR_PREDETERMINADO.slug);
    expect(lugarDeClub('CHICAGO YACHT CLUB').slug).toBe(LUGAR_PREDETERMINADO.slug);
    expect(lugarDeClub(null).slug).toBe(LUGAR_PREDETERMINADO.slug);
    expect(lugarDeClub(undefined).slug).toBe(LUGAR_PREDETERMINADO.slug);
  });
});

describe('urlViento', () => {
  it('el predeterminado vive en /viento y el resto en /viento/[slug]', () => {
    expect(urlViento('san-isidro')).toBe('/viento');
    expect(urlViento('rosario')).toBe('/viento/rosario');
  });
});

describe('distanciaKm', () => {
  it('San Isidro - San Fernando son ~13 km', () => {
    const d = distanciaKm(-34.4508, -58.4528, -34.457, -58.593);
    expect(d).toBeGreaterThan(12);
    expect(d).toBeLessThan(14);
  });

  it('un punto consigo mismo es 0', () => {
    expect(distanciaKm(-34, -58, -34, -58)).toBe(0);
  });
});
