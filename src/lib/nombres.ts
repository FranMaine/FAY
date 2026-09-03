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
