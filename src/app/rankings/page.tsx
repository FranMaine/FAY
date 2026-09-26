import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MedalIcon, ArrowRightIcon, AlertCircleIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { getRankingGeneral } from "@/lib/ranking-general";
import { RankingFilters } from "@/components/filters/ranking-filters";
import { Podio } from "@/components/ranking/podio";

export const metadata: Metadata = {
  title: "Rankings Oficiales",
  description: "Ranking Nacional anual por clase de vela, con el desempeño acumulado de cada regatista en los campeonatos de vela de Argentina.",
};

export const revalidate = 60; // Revalidar cada 60 segundos

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
  anios.push(0); // 0 = todos los años

  if (clases.length === 0) {
    return (
      <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
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
  const activeClaseId = typeof resolvedParams.clase === 'string' ? resolvedParams.clase : clases[0].id;
  const activeAnio = typeof resolvedParams.anio === 'string' ? parseInt(resolvedParams.anio) : currentYear;

  const ranking = await getRankingGeneral(activeClaseId, activeAnio);
  const selectedClaseNombre = clases.find(c => c.id === activeClaseId)?.nombre || '';

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <span className="text-primary">Regatistas</span>
            <span className="text-muted-foreground">/</span>
            <Link href="/rankings/clubes" className="text-muted-foreground hover:text-primary transition-colors">Clubes</Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Rankings Generales</h1>
          <p className="text-muted-foreground text-lg">Clasificaciones calculadas en base a los resultados de los campeonatos cargados.</p>
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
            <p className="text-sm">No hay campeonatos publicados de {selectedClaseNombre} {activeAnio === 0 ? "en ningún año" : `para el año ${activeAnio}`}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <Podio
              items={ranking.slice(0, 3).map((r) => ({
                id: r.id,
                href: `/regatistas/${r.id}`,
                titulo: r.nombre,
                subtitulo: r.club,
                puntos: r.puntosRanking,
              }))}
            />
            <Card className="bg-surface border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <caption className="sr-only">Ranking de regatistas de {selectedClaseNombre}</caption>
                    <thead className="sticky top-0 text-xs text-muted-foreground uppercase bg-surface border-b border-border">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-3 font-medium w-14 text-center">Pos</th>
                        <th scope="col" className="px-3 sm:px-6 py-3 font-medium">Regatista</th>
                        <th scope="col" className="hidden md:table-cell px-6 py-3 font-medium">Club</th>
                        <th scope="col" className="hidden sm:table-cell px-6 py-3 font-medium text-center">Campeonatos</th>
                        <th scope="col" className="px-3 sm:px-6 py-3 font-medium text-right">Puntaje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ranking.map((r, i) => {
                        const pos = i + 1;
                        const lider = ranking[0].puntosRanking || 1;
                        return (
                          <tr key={r.id} className={`hover:bg-background/50 transition-colors ${pos <= 3 ? "bg-primary/[0.04]" : ""}`}>
                            <td className="px-3 sm:px-6 py-3 text-center">
                              {pos <= 3 ? (
                                <MedalIcon aria-label={`Puesto ${pos}`} className={`w-5 h-5 mx-auto ${pos === 1 ? "text-yellow-500" : pos === 2 ? "text-slate-400" : "text-amber-700"}`} />
                              ) : (
                                <span className="font-medium text-muted-foreground">{pos}</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 font-medium">
                              <Link href={`/regatistas/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-2 group min-w-0">
                                <span className="truncate">{r.nombre}</span>
                                <ArrowRightIcon className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                              </Link>
                              <span className="md:hidden block text-xs text-muted-foreground truncate">{r.club}</span>
                            </td>
                            <td className="hidden md:table-cell px-6 py-3 text-muted-foreground">{r.club}</td>
                            <td className="hidden sm:table-cell px-6 py-3 text-center">{r.campeonatos}</td>
                            <td className="px-3 sm:px-6 py-3 text-right">
                              <span className="font-bold text-primary">{r.puntosRanking.toLocaleString("es-AR")} pts</span>
                              <span className="mt-1 ml-auto block h-1 w-16 sm:w-24 rounded-full bg-border overflow-hidden" aria-hidden="true">
                                <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.max(4, Math.round((r.puntosRanking / lider) * 100))}%` }} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
