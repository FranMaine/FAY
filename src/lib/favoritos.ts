import { prisma } from '@/lib/db';
import { posicionesFinales } from '@/lib/posiciones-campeonato';

// Tope por cuenta: sobra para una familia o un equipo, y acota el costo de
// armar la lista del inicio (una clasificación por campeonato reciente).
export const MAX_FAVORITOS = 30;

export interface UltimoResultado {
  campeonatoId: string;
  campeonato: string;
  clase: string;
  anio: number;
  posicion: number | null;
  totalParticipantes: number;
}

// Fecha con la que se ordena "el más reciente": la de inicio si está cargada
// y, si no, el fin de la temporada.
function fechaDeOrden(c: { fechaInicio: Date | null; anio: number }): number {
  return c.fechaInicio ? c.fechaInicio.getTime() : Date.UTC(c.anio, 11, 31);
}

/**
 * Último campeonato PUBLICADO en el que figura cada regatista, con la
 * posición que terminó. Los regatistas sin ningún resultado no aparecen en
 * el mapa.
 */
export async function ultimoResultadoDe(regatistaIds: string[]): Promise<Map<string, UltimoResultado>> {
  const salida = new Map<string, UltimoResultado>();
  if (regatistaIds.length === 0) return salida;

  // Primero solo lo liviano (qué campeonato y de cuándo) para elegir el más
  // reciente de cada uno; la clasificación completa se calcula después solo
  // para esos campeonatos.
  const filas = await prisma.resultado.findMany({
    where: { regatistaId: { in: regatistaIds }, regata: { campeonato: { estado: 'PUBLICADO' } } },
    select: {
      regatistaId: true,
      regata: {
        select: { campeonatoId: true, campeonato: { select: { fechaInicio: true, anio: true, updatedAt: true } } },
      },
    },
  });

  const elegido = new Map<string, { campeonatoId: string; orden: number; actualizado: number }>();
  for (const f of filas) {
    const c = f.regata.campeonato;
    const orden = fechaDeOrden(c);
    const actualizado = c.updatedAt.getTime();
    const previo = elegido.get(f.regatistaId);
    if (!previo || orden > previo.orden || (orden === previo.orden && actualizado > previo.actualizado)) {
      elegido.set(f.regatistaId, { campeonatoId: f.regata.campeonatoId, orden, actualizado });
    }
  }

  const campeonatoIds = [...new Set([...elegido.values()].map((e) => e.campeonatoId))];
  if (campeonatoIds.length === 0) return salida;

  const campeonatos = await prisma.campeonato.findMany({
    where: { id: { in: campeonatoIds } },
    include: {
      clase: true,
      regatas: {
        include: { resultados: { include: { regatista: { include: { club: true } } } } },
        orderBy: { numero: 'asc' },
      },
    },
  });
  const porId = new Map(
    campeonatos.map((c) => [c.id, { c, ...posicionesFinales(c) }] as const)
  );

  for (const [regatistaId, { campeonatoId }] of elegido) {
    const datos = porId.get(campeonatoId);
    if (!datos) continue;
    salida.set(regatistaId, {
      campeonatoId,
      campeonato: datos.c.nombre,
      clase: datos.c.clase.nombre,
      anio: datos.c.anio,
      posicion: datos.posicionDe.get(regatistaId) ?? null,
      totalParticipantes: datos.total,
    });
  }
  return salida;
}
