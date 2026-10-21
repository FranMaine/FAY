// Cuántas personas navegan un mismo bote en cada clase -sirve para saber si
// vale la pena juntar en una sola fila a quienes tienen el mismo puntaje
// (ver agruparTripulaciones en scoring.ts). En una clase de un solo
// tripulante (Optimist, ILCA, Finn) dos regatistas con el mismo puntaje en
// todas las regatas no son un bote: son un empate, y juntarlos mostraba
// "Fulano & Mengano & ..." en una sola fila (con 12 nombres cuando varios
// terminaron todo como DNF), lo que ensanchaba la columna del nombre y
// empujaba las regatas y el neto fuera de la pantalla.
//
// Para una clase que no está acá se asume el máximo razonable (5, un J24):
// así no se rompe lo que ya funcionaba, pero un grupo más grande que eso
// deja de agruparse (no hay botes de más de 5).
const SOLO_UNO = /optimist|ilca|laser|finn|windsurf|techno|kite/i;
const DE_DOS = /29er|420|470|49er|snipe|f18|star|hobie|nacra|vaurien|fj\b/i;
const MAXIMO_POR_DEFECTO = 5;

export function maxTripulantesPorBote(nombreClase: string): number {
  if (SOLO_UNO.test(nombreClase)) return 1;
  if (DE_DOS.test(nombreClase)) return 2;
  return MAXIMO_POR_DEFECTO;
}
