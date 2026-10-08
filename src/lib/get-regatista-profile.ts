import { prisma } from "@/lib/db";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";
import { calcularLogros, type LogroHistorialEntry } from "@/lib/logros";

// Data del perfil de un regatista -usada tanto por el perfil público
// (/regatistas/[id]) como por el dashboard propio (/mi-perfil), para que
// sean exactamente la misma información (antes el dashboard tenía su
// propia versión recortada, sin logros).
export async function getRegatistaProfile(id: string) {
  const regatista = await prisma.regatista.findUnique({
    where: { id },
    include: {
      club: true,
      otrosClubes: true,
      resultados: {
        include: {
          regata: {
            include: {
              campeonato: {
                include: {
                  clase: true,
                  sede: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!regatista) return null;

  // Encontrar todos los campeonatos únicos en los que participó
  const campeonatosIds = new Set(regatista.resultados.map((r) => r.regata.campeonatoId));
  const historial = [];
  const chartData = [];
  const historialLogros: LogroHistorialEntry[] = [];

  for (const campId of campeonatosIds) {
    // Para saber su posición final, necesitamos calcular la clasificación de todo el campeonato
    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campId },
      include: {
        clase: true,
        sede: true,
        regatas: {
          include: {
            resultados: {
              include: {
                regatista: { include: { club: true } },
              },
            },
          },
        },
      },
    });

    if (!campeonato || campeonato.estado !== "PUBLICADO") continue;

    const clasificacion = generarClasificacion(agruparPorRegatista(campeonato.regatas), campeonato.descartes);
    const miClasificacion = clasificacion.find((c) => c.regatistaId === id);

    if (miClasificacion) {
      historial.push({
        campeonato,
        posicion: miClasificacion.posicionFinal,
        totalInscriptos: clasificacion.length,
        puntosNetos: miClasificacion.totalNeto,
      });

      const fecha = campeonato.fechaInicio || new Date(campeonato.anio, 0, 1);
      chartData.push({
        campeonato: campeonato.nombre,
        posicion: miClasificacion.posicionFinal,
        anio: campeonato.anio,
        date: fecha,
      });

      // Diferencia de puntos con el 2° puesto, solo tiene sentido cuando
      // ganó (ver "margen-amplio" en logros.ts).
      const diferenciaSegundo =
        miClasificacion.posicionFinal === 1 && clasificacion[1]
          ? Math.round((clasificacion[1].totalNeto - miClasificacion.totalNeto) * 100) / 100
          : null;

      historialLogros.push({
        campeonatoId: campeonato.id,
        campeonatoNombre: campeonato.nombre,
        evento: campeonato.evento,
        claseId: campeonato.claseId,
        anio: campeonato.anio,
        fecha,
        posicion: miClasificacion.posicionFinal,
        totalInscriptos: clasificacion.length,
        diferenciaSegundo,
        resultados: miClasificacion.resultados.map((r) => ({
          regataNumero: r.regataNumero,
          puesto: r.puesto,
          descartado: r.descartado,
        })),
      });
    }
  }

  // Ordenar historial cronológicamente (más nuevo primero)
  historial.sort((a, b) => b.campeonato.anio - a.campeonato.anio);

  // Ordenar chartData cronológicamente (más viejo primero para el gráfico)
  chartData.sort((a, b) => a.date.getTime() - b.date.getTime());

  const logros = await calcularLogros(
    { id: regatista.id, clubId: regatista.clubId, otrosClubesIds: regatista.otrosClubes.map((c) => c.id) },
    historialLogros
  );

  return { regatista, historial, chartData, logros };
}

export type RegatistaProfileData = NonNullable<Awaited<ReturnType<typeof getRegatistaProfile>>>;
