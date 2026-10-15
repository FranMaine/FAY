// Funciones puras (sin base de datos) para buscar nombres: las usan tanto el
// servidor (lib/busqueda.ts) como las tablas y selectores del navegador.
// Búsqueda de nombres tolerante: no distingue mayúsculas, tildes ni orden de
// las palabras ("maria maine" = "Maine, María"). Cada palabra escrita tiene
// que aparecer en el nombre, en cualquier orden.

/** Minúsculas y sin tildes: "María" -> "maria". */
export function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Las palabras de una búsqueda, normalizadas ("  Maine  MARÍA " -> ["maine", "maria"]). */
export function palabrasDeBusqueda(texto: string): string[] {
  return normalizarBusqueda(texto).split(/[\s,;]+/).filter(Boolean);
}

/** ¿El texto contiene todas las palabras de la búsqueda, sin importar tildes, mayúsculas ni orden? */
export function coincidePorPalabras(texto: string, busqueda: string): boolean {
  const palabras = palabrasDeBusqueda(busqueda);
  if (palabras.length === 0) return true;
  const base = normalizarBusqueda(texto);
  return palabras.every((p) => base.includes(p));
}

// Cada letra base -> las variantes con tilde que puede tener guardada en la base.
const VARIANTES: Record<string, string> = {
  a: 'aáàâäãå',
  e: 'eéèêë',
  i: 'iíìîï',
  o: 'oóòôöõ',
  u: 'uúùûü',
  n: 'nñ',
  c: 'cç',
  y: 'yý',
};

/**
 * Patrón de expresión regular (para el operador ~* de Postgres, que ya ignora
 * mayúsculas) que encuentra la palabra con o sin tildes: "maria" ->
 * "m[aáàâäãå]r[iíìîï][aáàâäãå]". Hace falta porque ILIKE no ignora tildes:
 * buscar "maria" no encontraba "María".
 */
export function patronSinTildes(palabra: string): string {
  return normalizarBusqueda(palabra)
    .split('')
    .map((letra) => {
      if (VARIANTES[letra]) return `[${VARIANTES[letra]}]`;
      return letra.replace(/[\\^$.*+?()[\]{}|\-/]/g, '\\$&');
    })
    .join('');
}
