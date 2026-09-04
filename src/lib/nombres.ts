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

// Separadores que distintas fuentes usan para juntar los clubes de cada
// tripulante en una sola celda -no siempre es "-": vimos también "/", "&",
// "," y " y ". Se prueban en orden y se usa el primero que parta el texto
// en EXACTAMENTE tantas partes como personas hay -así un club que
// legítimamente tenga uno de estos caracteres en su nombre (raro, pero
// posible) no se rompe si la cuenta no cierra.
const SEPARADORES_CLUB = [/-/, /\//, /\s*&\s*/, /\s+y\s+/i, /,/, /;/];

/**
 * En una tripulación de más de una persona, el club a veces viene como
 * "CUBA-CVB" (o "CUBA/CVB", "CUBA & CVB", etc.) -no es un club compuesto,
 * es que cada tripulante navega para un club distinto. Si algún separador
 * conocido parte el texto en exactamente tantas partes como personas hay,
 * le asignamos una a cada uno; si ninguno cierra la cuenta (un club normal
 * sin separador, o cualquier otro caso ambiguo), todos quedan con el valor
 * completo tal cual vino -es preferible eso a adivinar mal.
 */
export function splitClubPorTripulante(club: string, cantidadPersonas: number): string[] {
  const texto = club.trim();
  if (cantidadPersonas > 1) {
    for (const separador of SEPARADORES_CLUB) {
      const partes = texto.split(separador).map((p) => p.trim()).filter(Boolean);
      if (partes.length === cantidadPersonas) {
        return partes;
      }
    }
  }
  return Array(cantidadPersonas).fill(texto);
}

/**
 * Cuando el archivo importado trae una columna de club SEPARADA para cada
 * tripulante (en vez de una sola celda con los clubes juntos por algún
 * separador), ya sabemos el club de cada uno sin tener que adivinar nada
 * -se usa esto en cambio de splitClubPorTripulante(). Si vienen menos
 * columnas de club que personas (ej: 3 tripulantes pero solo 2 columnas de
 * club), a los que sobran se les repite el último club conocido en vez de
 * dejarlos sin club.
 */
export function asignarClubesPorColumna(clubesPorColumna: string[], cantidadPersonas: number): string[] {
  const resultado: string[] = [];
  for (let i = 0; i < cantidadPersonas; i++) {
    const valor = clubesPorColumna[i] ?? clubesPorColumna[clubesPorColumna.length - 1] ?? '';
    resultado.push(valor.trim());
  }
  return resultado;
}
