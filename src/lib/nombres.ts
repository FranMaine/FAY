/**
 * Separa un nombre de tripulación en los nombres individuales de cada
 * integrante. En clases de doble tripulación (29er, 420, etc.) la fuente
 * suele traer a los dos regatistas en una sola celda -"Fulano & Mengano"-,
 * y si los guardáramos así quedarían como un único Regatista inventado en
 * vez de dos personas reales, cada una con su propio historial.
 *
 * Separa por "&" o por " y " (con espacios, para no partir apellidos que
 * contengan "y"). Para un nombre de una sola persona devuelve un array de
 * un solo elemento, sin tocarlo.
 */
export function splitNombreTripulacion(nombre: string): string[] {
  return nombre
    .split(/\s*&\s*|\s+y\s+/i)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

/**
 * En una tripulación de más de una persona, el club a veces viene como
 * "CUBA-CVB" -no es un club compuesto, es que cada tripulante navega para
 * un club distinto. Si separar por "-" da exactamente tantas partes como
 * personas hay, le asignamos una a cada uno; si no (un club normal sin
 * guión, o cualquier otro caso que no cierre la cuenta), todos quedan con
 * el valor completo tal cual vino -es preferible eso a adivinar mal.
 */
export function splitClubPorTripulante(club: string, cantidadPersonas: number): string[] {
  const partes = club.trim().split('-').map((p) => p.trim()).filter(Boolean);
  if (partes.length === cantidadPersonas && partes.length > 1) {
    return partes;
  }
  return Array(cantidadPersonas).fill(club.trim());
}
