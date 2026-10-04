// Mapa de búsqueda de un import: primero las entidades reales, y después los
// nombres viejos de las que se fusionaron. Una clave real nunca se pisa con
// un alias -si el mismo texto es el nombre de una ficha viva, esa gana.
export function mapaConAliases<T extends { id: string }>(
  entidades: T[],
  aliases: { clave: string; entidadId: string }[],
  claveDe: (entidad: T) => string
): Map<string, T> {
  const porId = new Map(entidades.map((e) => [e.id, e]));
  const mapa = new Map(entidades.map((e) => [claveDe(e), e]));
  for (const alias of aliases) {
    const entidad = porId.get(alias.entidadId);
    if (entidad && !mapa.has(alias.clave)) mapa.set(alias.clave, entidad);
  }
  return mapa;
}
