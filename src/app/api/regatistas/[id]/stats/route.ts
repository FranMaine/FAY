import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generarClasificacion, agruparPorRegatista } from '@/lib/scoring';
import { handleApiError } from '@/lib/api-error';

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

    type CampeonatoConRegatas = (typeof resultados)[number]['regata']['campeonato'];

    const campeonatosMap = new Map<string, CampeonatoConRegatas>();
    resultados.forEach((res) => {
      const camp = res.regata.campeonato;
      if (!campeonatosMap.has(camp.id)) {
        campeonatosMap.set(camp.id, camp);
      }
    });

    const campeonatosStats: {
      campeonatoId: string;
      anio: number;
      posicionFinal: number;
      puntosTotales: number;
      flota: number;
    }[] = [];
    const posiciones: number[] = [];

    for (const campeonato of campeonatosMap.values()) {
      const clasificacion = generarClasificacion(agruparPorRegatista(campeonato.regatas), campeonato.descartes);

      const regatistaPos = clasificacion.find((c) => c.regatistaId === id);

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

    // Math.min/max de un array vacío da Infinity/-Infinity -que
    // JSON.stringify convierte en "null" sin avisar- si el regatista tiene
    // resultados pero ninguno cayó en un campeonato ya clasificable.
    const summary = {
      totalCampeonatos: campeonatosStats.length,
      mejorPosicion: posiciones.length ? Math.min(...posiciones) : null,
      peorPosicion: posiciones.length ? Math.max(...posiciones) : null,
      promedioPosicion: posiciones.length ? (posiciones.reduce((a, b) => a + b, 0) / posiciones.length).toFixed(2) : 0,
      detalle: campeonatosStats
    };

    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error, 'GET /api/regatistas/[id]/stats');
  }
}
