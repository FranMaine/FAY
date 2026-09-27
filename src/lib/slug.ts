/**
 * Slug simple y determinístico para armar URLs de "evento" (grupo de
 * campeonatos por nombre+año, ver campeonatos-agrupados.tsx) sin tener que
 * guardar el slug en la base -se recalcula igual del lado del servidor al
 * resolver la ruta, comparando contra el nombre real del evento.
 */
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
