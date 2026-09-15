// URL pública y absoluta del sitio, usada donde hace falta una URL
// completa (no relativa): sitemap.xml, robots.txt, JSON-LD, links dentro
// de emails. Toma NEXT_PUBLIC_SITE_URL si está seteada (hay que
// configurarla en las variables de entorno de producción con el dominio
// real, ej: "https://stats.fay.org.ar") y si no cae a un valor de
// desarrollo -así todo esto sigue andando en local sin configurar nada,
// pero en producción hay que definir la variable para que apunten al
// dominio correcto en vez de a localhost.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'FAY Stats';
export const SITE_DESCRIPTION =
  'Resultados oficiales, rankings y estadísticas de regatas de la Federación Argentina de Yachting.';
