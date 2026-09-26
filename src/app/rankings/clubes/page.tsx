import { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { MedalIcon, ArrowRightIcon, AlertCircleIcon, UsersIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ClubAvatar } from "@/components/icons/club-avatar";
import { prisma } from "@/lib/db";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";
import { RankingFilters } from "@/components/filters/ranking-filters";
import { Podio } from "@/components/ranking/podio";
import { CLUB_ALIASES } from "@/lib/club-aliases";

export const metadata: Metadata = {
  title: "Ranking de Clubes",
  description: "Ranking Nacional de clubes por clase de vela, en base al desempeño acumulado de sus regatistas en los campeonatos de vela de Argentina.",
};

export const revalidate = 60;

async function calcularRankingDeClubes(claseId: string, anio: number) {
  const [campeonatos, clubes] = await Promise.all([
    prisma.campeonato.findMany({
      where: { estado: 'PUBLICADO', claseId, ...(anio !== 0 ? { anio } : {}) },
      include: {
        regatas: {
          include: {
            resultados: { include: { regatista: { include: { club: true, otrosClubes: true } } } }
          }
        }
      }
    }),
    prisma.club.findMany({ select: { id: true, nombre: true, logoUrl: true, nombreCompleto: true } }),
  ]);

  // Regatista -> ids de sus clubes SECUNDARIOS (doble club): la
  // clasificación (generarClasificacion) solo sabe del club principal, así
  // que sin esto un regatista con dos clubes solo sumaba puntos para el
  // primero, y el segundo quedaba siempre en cero en este ranking.
  const otrosClubesPorRegatista = new Map<string, string[]>();
  for (const camp of campeonatos) {
    for (const regata of camp.regatas) {
      for (const res of regata.resultados) {
        if (res.regatista.otrosClubes.length) {
          otrosClubesPorRegatista.set(res.regatista.id, res.regatista.otrosClubes.map((c) => c.id));
        }
      }
    }
  }

  // La clasificación no trae el id del club, solo su nombre -Club.nombre es
  // único en el schema, así que este mapa alcanza para volver a asociar cada
  // fila con el id real del club (y su logo) y poder linkear a /clubes/[id].
  const idPorNombre = new Map(clubes.map((c) => [c.nombre, c.id]));
  const clubPorId = new Map(clubes.map((c) => [c.id, c]));

  const clubesStats = new Map<string, { id: string; nombre: string; logoUrl: string | null; completo: string | null; regatistas: Set<string>; puntosRanking: number }>();

  function sumar(clubId: string, nombre: string, logoUrl: string | null, completo: string | null, regatistaId: string, puntos: number) {
    if (!clubesStats.has(clubId)) {
      clubesStats.set(clubId, { id: clubId, nombre, logoUrl, completo, regatistas: new Set(), puntosRanking: 0 });
    }
    const stats = clubesStats.get(clubId)!;
    stats.regatistas.add(regatistaId);
    stats.puntosRanking += puntos;
  }

  for (const camp of campeonatos) {
    const clasificacion = generarClasificacion(agruparPorRegatista(camp.regatas), camp.descartes);
    const totalInscriptos = clasificacion.length;

    clasificacion.forEach((c) => {
      const clubId = c.club ? idPorNombre.get(c.club) : undefined;
      if (!c.club || !clubId) return;
      const puntosObtenidos = (totalInscriptos - c.posicionFinal) + 1;
      const club = clubPorId.get(clubId);
      sumar(clubId, c.club, club?.logoUrl ?? null, club?.nombreCompleto ?? null, c.regatistaId, puntosObtenidos);

      for (const otroId of otrosClubesPorRegatista.get(c.regatistaId) ?? []) {
        const otro = clubPorId.get(otroId);
        if (!otro) continue;
        sumar(otroId, otro.nombre, otro.logoUrl, otro.nombreCompleto, c.regatistaId, puntosObtenidos);
      }
    });
  }

  return Array.from(clubesStats.values())
    .map((s) => ({ id: s.id, nombre: s.nombre, logoUrl: s.logoUrl, completo: s.completo, regatistas: s.regatistas.size, puntosRanking: s.puntosRanking }))
    .sort((a, b) => b.puntosRanking - a.puntosRanking);
}

// Mismo criterio que calcularRankingGeneral en /rankings: cachea 1h y se
// invalida al toque con revalidateTag("rankings") en vez de depender solo
// de que pase el tiempo -ver esos puntos en /api/campeonatos y /api/regatas.
const getRankingDeClubes = unstable_cache(calcularRankingDeClubes, ['ranking-clubes'], {
  revalidate: 3600,
  tags: ['rankings'],
});

export default async function RankingClubesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;

  const clases = await prisma.clase.findMany({ orderBy: { nombre: 'asc' } });

  const currentYear = new Date().getFullYear();
  const campeonatosAnios = await prisma.campeonato.findMany({
    select: { anio: true },
    distinct: ['anio'],
    orderBy: { anio: 'desc' },
  });
  const anios = campeonatosAnios.map((c) => c.anio);
  if (!anios.includes(currentYear)) anios.unshift(currentYear);
  anios.push(0); // 0 = todos los años

  if (clases.length === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Ranking de Clubes</h1>
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

  const activeClaseId = typeof resolvedParams.clase === 'string' ? resolvedParams.clase : clases[0].id;
  const activeAnio = typeof resolvedParams.anio === 'string' ? parseInt(resolvedParams.anio) : currentYear;

  const ranking = await getRankingDeClubes(activeClaseId, activeAnio);
  const selectedClaseNombre = clases.find((c) => c.id === activeClaseId)?.nombre || '';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Link href="/rankings" className="text-muted-foreground hover:text-primary transition-colors">Regatistas</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-primary">Clubes</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Ranking de Clubes</h1>
          <p className="text-muted-foreground text-lg">Suma de los puntos de todos los regatistas de cada club, por clase y temporada.</p>
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
                href: `/clubes/${r.id}`,
                titulo: r.nombre,
                subtitulo: r.completo || CLUB_ALIASES[r.nombre] || null,
                puntos: r.puntosRanking,
                avatar: <ClubAvatar nombre={r.nombre} logoUrl={r.logoUrl} className="w-11 h-11 text-sm" />,
              }))}
            />
            <Card className="bg-surface border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <caption className="sr-only">Ranking de clubes de {selectedClaseNombre}</caption>
                    <thead className="sticky top-0 text-xs text-muted-foreground uppercase bg-surface border-b border-border">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-3 font-medium w-14 text-center">Pos</th>
                        <th scope="col" className="px-3 sm:px-6 py-3 font-medium">Club</th>
                        <th scope="col" className="hidden sm:table-cell px-6 py-3 font-medium text-center">Regatistas</th>
                        <th scope="col" className="px-3 sm:px-6 py-3 font-medium text-right">Puntaje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ranking.map((r, i) => {
                        const pos = i + 1;
                        const nombreCompleto = r.completo || CLUB_ALIASES[r.nombre] || r.nombre;
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
                              <Link href={`/clubes/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-3 group min-w-0">
                                <ClubAvatar nombre={r.nombre} logoUrl={r.logoUrl} className="w-8 h-8 text-xs" />
                                <span className="min-w-0">
                                  <span className="block truncate" title={nombreCompleto}>{r.nombre}</span>
                                  <span className="sm:hidden block text-xs text-muted-foreground">{r.regatistas} regatistas</span>
                                </span>
                                <ArrowRightIcon className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                              </Link>
                            </td>
                            <td className="hidden sm:table-cell px-6 py-3 text-center text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" aria-hidden="true" /> {r.regatistas}</span>
                            </td>
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
