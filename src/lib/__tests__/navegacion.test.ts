import { describe, it, expect } from 'vitest';
import { rutaPadre, actualizarPila, destinoVolver } from '../navegacion';

describe('rutaPadre', () => {
  it.each([
    ['/campeonatos/abc123', '/campeonatos'],
    ['/campeonatos/evento/2026/vela-fest', '/campeonatos'],
    ['/clubes/xyz', '/clubes'],
    ['/clubes/xyz/j24', '/clubes/xyz'],
    ['/regatistas/abc', '/'],
    ['/viento/rosario', '/'],
    ['/viento', '/'],
    ['/rankings/clubes', '/rankings'],
    ['/rankings', '/'],
    ['/mi-perfil/configuracion', '/mi-perfil'],
    ['/admin', '/'],
    ['/admin/campeonatos', '/admin'],
    ['/admin/campeonatos/abc', '/admin/campeonatos'],
    ['/admin/clubes/ambiguos', '/admin/clubes'],
    ['/admin/regatistas/duplicados', '/admin/regatistas'],
  ])('%s -> %s', (ruta, padre) => {
    expect(rutaPadre(ruta)).toBe(padre);
  });

  it('las páginas de un solo nivel vuelven al inicio', () => {
    for (const ruta of ['/contacto', '/login', '/cookies', '/reglas', '/agregar-app', '/privacidad']) {
      expect(rutaPadre(ruta)).toBe('/');
    }
  });

  it('una URL inventada (404) no genera un padre que también daría 404', () => {
    expect(rutaPadre('/foo/bar')).toBe('/');
    expect(rutaPadre('/foo')).toBe('/');
  });

  it('ignora la barra final', () => {
    expect(rutaPadre('/clubes/xyz/')).toBe('/clubes');
  });

  it('el inicio no tiene padre', () => {
    expect(rutaPadre('/')).toBe('/');
  });
});

describe('actualizarPila', () => {
  it('agrega una página nueva', () => {
    expect(actualizarPila(['/'], '/campeonatos')).toEqual(['/', '/campeonatos']);
  });

  it('no duplica si es la misma página (ej: cambió solo la query)', () => {
    expect(actualizarPila(['/', '/rankings'], '/rankings')).toEqual(['/', '/rankings']);
  });

  it('quita la actual si se volvió a la anterior (con el botón o con el del navegador)', () => {
    expect(actualizarPila(['/', '/campeonatos', '/campeonatos/abc'], '/campeonatos')).toEqual(['/', '/campeonatos']);
  });

  it('no muta la pila que recibe', () => {
    const pila = ['/', '/clubes'];
    actualizarPila(pila, '/');
    expect(pila).toEqual(['/', '/clubes']);
  });

  it('limita la profundidad', () => {
    let pila: string[] = ['/'];
    for (let i = 0; i < 200; i++) pila = actualizarPila(pila, `/clubes/${i}`);
    expect(pila.length).toBeLessThanOrEqual(50);
    expect(pila[pila.length - 1]).toBe('/clubes/199');
  });
});

describe('destinoVolver', () => {
  it('si viene navegando por la app, vuelve un paso en el historial', () => {
    expect(destinoVolver(['/', '/campeonatos', '/campeonatos/abc'], '/campeonatos/abc')).toEqual({ tipo: 'historial' });
  });

  it('si entró directo a la página, va al nivel superior en vez de retroceder (que podría sacarla del sitio)', () => {
    expect(destinoVolver(['/campeonatos/abc'], '/campeonatos/abc')).toEqual({ tipo: 'ruta', href: '/campeonatos' });
  });

  it('después de loguearse no devuelve al formulario de login', () => {
    expect(destinoVolver(['/login', '/mi-perfil'], '/mi-perfil')).toEqual({ tipo: 'ruta', href: '/' });
  });

  it('dentro del flujo de acceso sí retrocede (ej: de "olvidé mi contraseña" al login)', () => {
    expect(destinoVolver(['/login', '/olvide-password'], '/olvide-password')).toEqual({ tipo: 'historial' });
  });
});
