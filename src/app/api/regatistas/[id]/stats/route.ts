import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generarClasificacion } from '@/lib/scoring';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resultados = await prisma.resultado.findMany({
      where: { regatistaId: id },
      include: {
        regata: {
          include: {
            campeonato: {
              include: {
                regatas: {
                  include: {
                    resultados: {
                      include: {
                        regatista: true
                      }
                    }
                  },
                  orderBy: { numero: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!resultados || resultados.length === 0) {
      return NextResponse.json({ error: 'No stats found' }, { status: 404 });
    }

    const campeonatosMap = new Map();
    resultados.forEach((res: any) => {
      const camp = res.regata.campeonato;
      if (!campeonatosMap.has(camp.id)) {
        campeonatosMap.set(camp.id, camp);
      }
    });

    const campeonatosStats: any[] = [];
    let posiciones: number[] = [];

    for (const [_, campeonato] of campeonatosMap) {
      const regatistasMap = new Map();
      campeonato.regatas.forEach((regata: any) => {
        regata.resultados.forEach((resultado: any) => {
          const { regatista } = resultado;
          if (!regatistasMap.has(regatista.id)) {
            regatistasMap.set(regatista.id, {
              regatistaId: regatista.id,
              nombre: regatista.nombre,
              club: regatista.clubId || null,
              resultados: []
            });
          }
          regatistasMap.get(regatista.id).resultados.push({
            regataNumero: regata.numero,
            puesto: resultado.puesto,
            puntos: resultado.puntos,
            observacion: resultado.observacion
          });
        });
      });
      const regatistas = Array.from(regatistasMap.values());
      const clasificacion = generarClasificacion(regatistas, campeonato.descartes);
      
      const regatistaPos = clasificacion.find((c: any) => c.regatistaId === id);
      
      if (regatistaPos) {
        posiciones.push(regatistaPos.posicionFinal);
        campeonatosStats.push({
          campeonatoId: campeonato.id,
          anio: campeonato.anio,
          posicionFinal: regatistaPos.posicionFinal,
          puntosTotales: regatistaPos.totalNeto,
          flota: clasificacion.length
        });
      }
    }

    const summary = {
      totalCampeonatos: campeonatosStats.length,
      mejorPosicion: Math.min(...posiciones),
      peorPosicion: Math.max(...posiciones),
      promedioPosicion: posiciones.length ? (posiciones.reduce((a, b) => a + b, 0) / posiciones.length).toFixed(2) : 0,
      detalle: campeonatosStats
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching regatista stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
