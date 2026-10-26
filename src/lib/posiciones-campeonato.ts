import { agruparPorRegatista, generarClasificacion, agruparTripulaciones } from '@/lib/scoring';
import { maxTripulantesPorBote } from '@/lib/clases-tripulacion';

type RegatasDelCampeonato = Parameters<typeof agruparPorRegatista>[0];

/**
 * Posición final de cada regatista en un campeonato, con la misma
 * clasificación que muestra la página del campeonato (descartes y
 * tripulaciones incluidos): en una clase con tripulación, todos los
 * integrantes del bote comparten la posición del bote.
 */
export function posicionesFinales(campeonato: {
  descartes: number;
  clase: { nombre: string };
  regatas: RegatasDelCampeonato;
}): { posicionDe: Map<string, number>; total: number } {
  const clasificacion = agruparTripulaciones(
    generarClasificacion(agruparPorRegatista(campeonato.regatas), campeonato.descartes),
    maxTripulantesPorBote(campeonato.clase.nombre)
  );
  const posicionDe = new Map<string, number>();
  for (const fila of clasificacion) {
    const ids = fila.integrantes?.length ? fila.integrantes.map((i) => i.regatistaId) : [fila.regatistaId];
    for (const id of ids) posicionDe.set(id, fila.posicionFinal);
  }
  return { posicionDe, total: clasificacion.length };
}
