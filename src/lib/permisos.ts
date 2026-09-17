/**
 * Roles con permiso para crear/editar campeonatos, regatas, resultados
 * (importar CSV, publicar, etc.) -ADMIN tiene esto y todo lo demás;
 * ORGANIZADOR tiene SOLO esto (pensado para la persona del club que
 * organiza una regata puntual y carga sus resultados, sin acceso a
 * gestión de regatistas, clubes, solicitudes de vinculación, errores del
 * sistema, ni a asignar roles).
 */
export function puedeGestionarCampeonatos(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'ORGANIZADOR';
}
