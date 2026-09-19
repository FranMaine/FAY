import { Metadata } from "next";
import Link from "next/link";
import { MedalIcon, ArrowRightIcon, AlertCircleIcon, UsersIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ClubAvatar } from "@/components/icons/club-avatar";
import { prisma } from "@/lib/db";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";
import { RankingFilters } from "@/components/filters/ranking-filters";
import { CLUB_ALIASES } from "@/lib/club-aliases";

export const metadata: Metadata = {
  title: "Ranking de Clubes",
  description: "Ranking Nacional de clubes por clase de vela, en base al desempeño acumulado de sus regatistas en los campeonatos de vela de Argentina.",
};

export const revalidate = 60;

async function getRankingDeClubes(claseId: string, anio: number) {
  const [campeonatos, clubes] = await Promise.all([
    prisma.campeonato.findMany({
      where: { estado: 'PUBLICADO', claseId, ...(anio !== 0 ? { anio } : {}) },
      include: {
        regatas: {
          include: {
            resultados: { include: { regatista: { include: { club: true } } } }
          }
        }
      }
    }),
    prisma.club.findMany({ select: { id: true, nombre: true, logoUrl: true, nombreCompleto: true } }),
  ]);

  // La clasificación no trae el id del club, solo su nombre -Club.nombre es
  // único en el schema, así que este mapa alcanza para volver a asociar cada
  // fila con el id real del club (y su logo) y poder linkear a /clubes/[id].
  const idPorNombre = new Map(clubes.map((c) => [c.nombre, c.id]));
  const completoPorNombre = new Map(clubes.map((c) => [c.nombre, c.nombreCompleto]));
  const logoPorNombre = new Map(clubes.map((c) => [c.nombre, c.logoUrl]));

  const clubesStats = new Map<string, { id: string; nombre: string; logoUrl: string | null; completo: string | null; regatistas: Set<string>; puntosRanking: number }>();

  for (const camp of campeonatos) {
    const clasificacion = generarClasificacion(agruparPorRegatista(camp.regatas), camp.descartes);
    const totalInscriptos = clasificacion.length;

    clasificacion.forEach((c) => {
      const clubId = c.club ? idPorNombre.get(c.club) : undefined;
      if (!c.club || !clubId) return;
      if (!clubesStats.has(clubId)) {
        clubesStats.set(clubId, { id: clubId, nombre: c.club, logoUrl: logoPorNombre.get(c.club) ?? null, completo: completoPorNombre.get(c.club) ?? null, regatistas: new Set(), puntosRanking: 0 });
      }
      const stats = clubesStats.get(clubId)!;
      stats.regatistas.add(c.regatistaId);
      const puntosObtenidos = (totalInscriptos - c.posicionFinal) + 1;
      stats.puntosRanking += puntosObtenidos;
    });
  }

  return Array.from(clubesStats.values())
    .map((s) => ({ id: s.id, nombre: s.nombre, logoUrl: s.logoUrl, completo: s.completo, regatistas: s.regatistas.size, puntosRanking: s.puntosRanking }))
    .sort((a, b) => b.puntosRanking - a.puntosRanking);
}

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
          <Card className="bg-surface border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium w-16 text-center">Pos</th>
                      <th className="px-6 py-4 font-medium">Club</th>
                      <th className="px-6 py-4 font-medium text-center">Regatistas</th>
                      <th className="px-6 py-4 font-medium text-right">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ranking.map((r, i) => {
                      const pos = i + 1;
                      const nombreCompleto = r.completo || CLUB_ALIASES[r.nombre] || r.nombre;
                      return (
                        <tr key={r.id} className="hover:bg-background/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-center">
                            {pos === 1 ? <MedalIcon className="w-6 h-6 text-yellow-500 mx-auto" /> :
                             pos === 2 ? <MedalIcon className="w-6 h-6 text-gray-400 mx-auto" /> :
                             pos === 3 ? <MedalIcon className="w-6 h-6 text-amber-700 mx-auto" /> :
                             <span className="text-muted-foreground">{pos}</span>}
                          </td>
                          <td className="px-6 py-4 font-medium text-lg">
                            <Link href={`/clubes/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-3 group">
                              <ClubAvatar nombre={r.nombre} logoUrl={r.logoUrl} className="w-8 h-8 text-xs" />
                              <span title={nombreCompleto}>{r.nombre}</span>
                              <ArrowRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-center text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" /> {r.regatistas}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-primary text-lg">{r.puntosRanking} pts</td>
                        </tr>
                      );
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
