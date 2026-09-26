import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";

export async function calcularRankingGeneral(claseId: string, anio: number) {
  const campeonatos = await prisma.campeonato.findMany({
    where: { 
      estado: 'PUBLICADO',
      claseId,
      // anio 0 = "Todos los años": el ranking suma todos los campeonatos cargados
      ...(anio !== 0 ? { anio } : {})
    },
    include: {
      regatas: {
        include: {
          resultados: {
            include: {
              regatista: { include: { club: true } }
            }
          }
        }
      }
    }
  });

  const regatistasStats = new Map<string, { id: string, nombre: string, club: string, campeonatos: number, puntosRanking: number }>();

  for (const camp of campeonatos) {
    const clasificacion = generarClasificacion(agruparPorRegatista(camp.regatas), camp.descartes);
    const totalInscriptos = clasificacion.length;

    clasificacion.forEach(c => {
      if (!regatistasStats.has(c.regatistaId)) {
        regatistasStats.set(c.regatistaId, {
          id: c.regatistaId,
          nombre: c.nombre,
          club: c.club || 'Sin club',
          campeonatos: 0,
          puntosRanking: 0
        });
      }
      
      const stats = regatistasStats.get(c.regatistaId)!;
      stats.campeonatos += 1;
      
      // Fórmula de Puntos = (Total Inscriptos - Posición Final) + 1
      const puntosObtenidos = (totalInscriptos - c.posicionFinal) + 1;
      stats.puntosRanking += puntosObtenidos;
    });
  }

  // Ordenar por puntos (mayor a menor)
  return Array.from(regatistasStats.values()).sort((a, b) => b.puntosRanking - a.puntosRanking);
}

// Con "Todos los años" (ver ranking-filters.tsx), este cálculo recorre y
// reprocesa TODOS los campeonatos publicados de esa clase desde siempre
// -crece con el histórico, no con el tráfico. En vez de depender solo del
// `revalidate` de la página (60s, sigue vigente como red de contención),
// esto cachea el resultado más tiempo (1h) y lo invalida al toque cuando
// algo que puede cambiar un ranking realmente pasa (publicar/despublicar/
// editar un campeonato, cargar resultados) vía revalidateTag("rankings")
// -ver esos mismos puntos en /api/campeonatos y /api/regatas.
export const getRankingGeneral = unstable_cache(calcularRankingGeneral, ['ranking-general'], {
  revalidate: 3600,
  tags: ['rankings'],
});

