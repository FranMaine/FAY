// Lógica del botón "Volver" global (ver BotonVolver). Todo acá es puro, sin
// React ni router, así se puede probar entero.

// Secciones que tienen subpáginas. Un "nivel superior" solo se calcula
// adentro de una de ellas: para una URL inventada (/foo/bar, que da 404) el
// padre generado (/foo) también daría 404, así que ahí se vuelve al inicio.
const SECCIONES = ['admin', 'campeonatos', 'clubes', 'rankings', 'mi-perfil', 'regatistas', 'viento'];

// Rutas cuyo padre "natural" no es el que saldría de quitar el último tramo.
const PADRES_ESPECIALES: [RegExp, string][] = [
  // /campeonatos/evento/2026/vela-fest -> quitar el último tramo daría
  // /campeonatos/evento/2026, que no existe.
  [/^\/campeonatos\/evento\/[^/]+\/[^/]+$/, '/campeonatos'],
  // No hay una página /regatistas: el perfil se llega desde el inicio, el
  // buscador o una tabla de resultados.
  [/^\/regatistas\/[^/]+$/, '/'],
  // El lugar es una variante de /viento, pero salir de ahí es salir de la
  // sección (el selector ya cambia de lugar sin sumar pasos).
  [/^\/viento\/[^/]+$/, '/'],
];

/** El "nivel de arriba" de una ruta: a dónde se va cuando no hay historial adentro de la app. */
export function rutaPadre(pathname: string): string {
  const ruta = pathname.replace(/\/+$/, '') || '/';
  if (ruta === '/') return '/';

  for (const [patron, padre] of PADRES_ESPECIALES) {
    if (patron.test(ruta)) return padre;
  }

  const tramos = ruta.split('/').filter(Boolean);
  if (!SECCIONES.includes(tramos[0])) return '/';
  tramos.pop();
  return tramos.length ? `/${tramos.join('/')}` : '/';
}

// Pantallas del flujo de entrar/registrarse: volver "hacia atrás" desde la
// primera página después de loguearse te devolvería al formulario de login.
const RUTAS_DE_ACCESO = ['/login', '/registro', '/olvide-password', '/reset-password', '/verificar-email'];

const PROFUNDIDAD_MAXIMA = 50;

/**
 * Mantiene la pila de páginas por las que se navegó adentro de la app (solo
 * en memoria: una recarga la reinicia). Una página nueva se agrega; volver a
 * la anterior -con nuestro botón o con el gesto/botón del navegador- la
 * quita, así queda alineada con el historial real sin depender de APIs
 * del navegador que no están en todos lados.
 */
export function actualizarPila(pila: readonly string[], pathname: string): string[] {
  if (pila[pila.length - 1] === pathname) return [...pila];
  if (pila.length > 1 && pila[pila.length - 2] === pathname) return pila.slice(0, -1);
  return [...pila, pathname].slice(-PROFUNDIDAD_MAXIMA);
}

export type DestinoVolver = { tipo: 'historial' } | { tipo: 'ruta'; href: string };

/**
 * Si la persona viene navegando por Orzando, "Volver" es un paso atrás en el
 * historial (a donde estaba: una tabla, el buscador, etc.). Si entró directo
 * a esta página o recargó -no hay "atrás" propio, y retroceder podría
 * sacarla del sitio-, se va al nivel superior.
 */
export function destinoVolver(pila: readonly string[], pathname: string): DestinoVolver {
  const anterior = pila.length > 1 ? pila[pila.length - 2] : null;
  const vieneDeAcceso = anterior !== null && RUTAS_DE_ACCESO.includes(anterior) && !RUTAS_DE_ACCESO.includes(pathname);
  if (anterior !== null && !vieneDeAcceso) return { tipo: 'historial' };
  return { tipo: 'ruta', href: rutaPadre(pathname) };
}
