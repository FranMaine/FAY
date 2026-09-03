import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MedalIcon, ArrowRightIcon, AlertCircleIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";
import { RankingFilters } from "@/components/filters/ranking-filters";

export const metadata: Metadata = {
  title: "Rankings Oficiales | FAY Stats",
};

export const revalidate = 60; // Revalidar cada 60 segundos

async function getRankingGeneral(claseId: string, anio: number) {
  const campeonatos = await prisma.campeonato.findMany({
    where: { 
      estado: 'PUBLICADO',
      claseId,
      anio
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
      
      // Fórmula de Puntos FAY = (Total Inscriptos - Posición Final) + 1
      const puntosObtenidos = (totalInscriptos - c.posicionFinal) + 1;
      stats.puntosRanking += puntosObtenidos;
    });
  }

  // Ordenar por puntos (mayor a menor)
  return Array.from(regatistasStats.values()).sort((a, b) => b.puntosRanking - a.puntosRanking);
}

export default async function RankingsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;

  // Obtener datos base para los filtros
  const clases = await prisma.clase.findMany({ orderBy: { nombre: 'asc' } });
  
  const currentYear = new Date().getFullYear();
  // Obtener años únicos de los campeonatos
  const campeonatosAnios = await prisma.campeonato.findMany({
    select: { anio: true },
    distinct: ['anio'],
    orderBy: { anio: 'desc' }
  });
  const anios = campeonatosAnios.map(c => c.anio);
  if (!anios.includes(currentYear)) anios.unshift(currentYear);

  if (clases.length === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Rankings Generales</h1>
          </header>
          <Card className="bg-surface border-border text-center py-12">
            <CardContent>
              <div className="text-muted-foreground">No hay clases configuradas en el sistema.</div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Si no hay params, buscar el default (el que tenga más regatas o el primero)
  let activeClaseId = typeof resolvedParams.clase === 'string' ? resolvedParams.clase : clases[0].id;
  let activeAnio = typeof resolvedParams.anio === 'string' ? parseInt(resolvedParams.anio) : currentYear;

  const ranking = await getRankingGeneral(activeClaseId, activeAnio);
  const selectedClaseNombre = clases.find(c => c.id === activeClaseId)?.nombre || '';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Rankings Generales</h1>
          <p className="text-muted-foreground text-lg">Clasificaciones calculadas en base a resultados de los campeonatos oficiales de FAY.</p>
        </header>

        <RankingFilters 
          clases={clases} 
          anios={anios} 
          currentClaseId={activeClaseId} 
          currentAnio={activeAnio} 
        />

        {ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-surface/50 text-muted-foreground">
            <AlertCircleIcon className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-lg font-medium">Sin resultados</p>
            <p className="text-sm">No hay campeonatos publicados de {selectedClaseNombre} para el año {activeAnio}.</p>
          </div>
        ) : (
          <Card className="bg-surface border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium w-16 text-center">Pos</th>
                      <th className="px-6 py-4 font-medium">Regatista</th>
                      <th className="px-6 py-4 font-medium">Club</th>
                      <th className="px-6 py-4 font-medium text-center">Campeonatos</th>
                      <th className="px-6 py-4 font-medium text-right">Puntaje FAY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ranking.map((r, i) => {
                      const pos = i + 1;
                      return (
                        <tr key={r.id} className="hover:bg-background/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-center">
                            {pos === 1 ? <MedalIcon className="w-6 h-6 text-yellow-500 mx-auto" /> : 
                             pos === 2 ? <MedalIcon className="w-6 h-6 text-gray-400 mx-auto" /> : 
                             pos === 3 ? <MedalIcon className="w-6 h-6 text-amber-700 mx-auto" /> : 
                             <span className="text-muted-foreground">{pos}</span>}
                          </td>
                          <td className="px-6 py-4 font-medium text-lg">
                            <Link href={`/regatistas/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-2 group">
                              {r.nombre}
                              <ArrowRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{r.club}</td>
                          <td className="px-6 py-4 text-center">{r.campeonatos}</td>
                          <td className="px-6 py-4 text-right font-bold text-primary text-lg">{r.puntosRanking} pts</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
