import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MedalIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClaseIcon } from "@/components/icons/clase-icons";
import { ClubAvatar } from "@/components/icons/club-avatar";
import { CsvDownloadButton } from "@/components/ui/csv-download-button";
import { SITE_URL } from "@/lib/site";
import { CLUB_ALIASES } from "@/lib/club-aliases";
import { jsonLdSeguro } from "@/lib/json-ld";

// Mismo criterio que /campeonatos/[id] y /regatistas/[id]: sin esto la
// página queda cacheada estática para siempre, y un resultado nuevo
// cargado por un admin no se vería acá hasta el próximo deploy.
export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id }, select: { nombre: true, nombreCompleto: true } });
  if (!club) return { title: "Club no encontrado" };
  const nombreCompleto = club.nombreCompleto || CLUB_ALIASES[club.nombre] || club.nombre;
  return {
    title: club.nombre,
    description: `Estadísticas y ranking de los regatistas de ${nombreCompleto} en los campeonatos de vela de Argentina.`,
  };
}

async function getStatsDelClub(clubId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return null;

  const regatistasCount = await prisma.regatista.count({ where: { OR: [{ clubId }, { otrosClubes: { some: { id: clubId } } }] } });

  // A propósito NO se trae acá el árbol completo de cada campeonato en el
  // que compitió algún regatista del club (regatas + TODOS sus
  // participantes) para recalcular la clasificación oficial con
  // generarClasificacion(), como hace /rankings o /regatistas/[id]. Se
  // probó así primero y un club grande (ej: CNSI, 101 regatistas) terminaba
  // trayendo 30 campeonatos con >20.000 filas de Resultado combinadas
  // -14 a 70+ segundos de carga, muy por encima de cualquier timeout
  // razonable de función serverless. En cambio, acá se traen SOLO los
  // resultados propios de los regatistas de este club (unas pocas
  // centenas, no decenas de miles) y las métricas se calculan sobre eso:
  // más liviano, a costa de que "mejor puesto" sea el mejor puesto en UNA
  // regata puntual (dato ya guardado en cada Resultado), no la posición
  // final recalculada de un campeonato entero.
  const resultados = await prisma.resultado.findMany({
    where: {
      regatista: { OR: [{ clubId }, { otrosClubes: { some: { id: clubId } } }] },
      regata: { campeonato: { estado: "PUBLICADO" } },
    },
    select: {
      puesto: true,
      puestoOficial: true,
      regatistaId: true,
      regatista: { select: { nombre: true } },
      regata: {
        select: {
          campeonato: { select: { clase: { select: { nombre: true } } } },
        },
      },
    },
  });

  return { club, regatistasCount, resultados };
}

export default async function ClubDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getStatsDelClub(id);
  if (!data) notFound();

  const { club, regatistasCount, resultados } = data;

  // Por categoría: cuántos regatistas distintos del club compitieron en
  // cada clase, cuántos resultados en total, y el mejor puesto que alguno
  // de ellos haya logrado en una regata de esa clase.
  const porCategoria = new Map<
    string,
    { claseNombre: string; regatistas: Set<string>; resultados: number; mejorPuesto: number }
  >();
  // Ranking interno: victorias/podios/resultados de cada regatista del
  // club, a través de todas las clases en las que compitió.
  const porRegatista = new Map<
    string,
    { regatistaId: string; nombre: string; resultados: number; victorias: number; podios: number; mejorPuesto: number }
  >();

  for (const r of resultados) {
    const puesto = r.puestoOficial ?? r.puesto;
    const claseNombre = r.regata.campeonato.clase.nombre;

    if (!porCategoria.has(claseNombre)) {
      porCategoria.set(claseNombre, { claseNombre, regatistas: new Set(), resultados: 0, mejorPuesto: Infinity });
    }
    const cat = porCategoria.get(claseNombre)!;
    cat.regatistas.add(r.regatistaId);
    cat.resultados += 1;
    cat.mejorPuesto = Math.min(cat.mejorPuesto, puesto);

    if (!porRegatista.has(r.regatistaId)) {
      porRegatista.set(r.regatistaId, { regatistaId: r.regatistaId, nombre: r.regatista.nombre, resultados: 0, victorias: 0, podios: 0, mejorPuesto: Infinity });
    }
    const reg = porRegatista.get(r.regatistaId)!;
    reg.resultados += 1;
    if (puesto === 1) reg.victorias += 1;
    if (puesto <= 3) reg.podios += 1;
    reg.mejorPuesto = Math.min(reg.mejorPuesto, puesto);
  }

  const categorias = [...porCategoria.values()].sort((a, b) => b.resultados - a.resultados);
  const rankingInterno = [...porRegatista.values()].sort(
    (a, b) => b.victorias - a.victorias || b.podios - a.podios || b.resultados - a.resultados
  );

  const aliasClub = club.nombreCompleto || CLUB_ALIASES[club.nombre];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: aliasClub || club.nombre,
    ...(aliasClub ? { alternateName: club.nombre } : {}),
    url: `${SITE_URL}/clubes/${club.id}`,
    ...(club.ciudad ? { address: { "@type": "PostalAddress", addressLocality: club.ciudad } } : {}),
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link href="/clubes">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors -ml-1">
              <ArrowLeftIcon className="w-4 h-4" /> Volver a clubes
            </span>
          </Link>
        </div>

        <header className="relative flex flex-col sm:flex-row sm:items-center gap-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-surface to-surface p-6 md:p-10">
          <ClubAvatar nombre={club.nombre} logoUrl={club.logoUrl} className="w-24 h-24 md:w-28 md:h-28 text-2xl" transitionName={`club-${club.id}`} />
          <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{club.nombre}</h1>
            {aliasClub && <p className="mt-1 text-lg text-muted-foreground">{aliasClub}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
              {club.ciudad && <span>{club.ciudad}</span>}
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <UsersIcon className="w-4 h-4" aria-hidden="true" />
                <span className="tabular-nums">{regatistasCount}</span> regatista{regatistasCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </header>

        {resultados.length === 0 ? (
          <Card className="bg-surface border-border text-center py-12">
            <CardContent>
              <div className="text-muted-foreground">
                Todavía no hay resultados publicados de regatistas de este club.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">Por categoría</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorias.map((cat) => (
                  <Card key={cat.claseNombre} className="bg-surface border-border rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClaseIcon nombreClase={cat.claseNombre} className="w-6 h-6 shrink-0" />
                        {cat.claseNombre}
                      </CardTitle>
                      <CardDescription>
                        {cat.regatistas.size} regatista{cat.regatistas.size === 1 ? "" : "s"} · {cat.resultados} resultado{cat.resultados === 1 ? "" : "s"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MedalIcon className="w-4 h-4 text-amber-500" />
                        Mejor puesto en una regata: <span className="font-semibold text-foreground">{cat.mejorPuesto}º</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-primary" /> Ranking del club
                </h2>
                <CsvDownloadButton
                  filename={`${club.nombre} - ranking.csv`}
                  headers={["Posición", "Regatista", "Resultados", "Victorias", "Podios", "Mejor puesto"]}
                  rows={rankingInterno.map((r, i) => [i + 1, r.nombre, r.resultados, r.victorias, r.podios, r.mejorPuesto])}
                />
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Regatistas del club ordenados por victorias y podios en regatas individuales, a través de todas las clases en las que compitieron.
              </p>
              <Card className="bg-surface border-border overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                        <tr>
                          <th className="px-6 py-4 font-medium w-16 text-center">Pos</th>
                          <th className="px-6 py-4 font-medium">Regatista</th>
                          <th className="px-6 py-4 font-medium text-center">Resultados</th>
                          <th className="px-6 py-4 font-medium text-center">Victorias</th>
                          <th className="px-6 py-4 font-medium text-center">Podios</th>
                          <th className="px-6 py-4 font-medium text-right">Mejor puesto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rankingInterno.map((r, i) => (
                          <tr key={r.regatistaId} className="hover:bg-background/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-center text-muted-foreground">{i + 1}</td>
                            <td className="px-6 py-4 font-medium">
                              <Link href={`/regatistas/${r.regatistaId}`} className="hover:text-primary transition-colors">
                                {r.nombre}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-center">{r.resultados}</td>
                            <td className="px-6 py-4 text-center">{r.victorias}</td>
                            <td className="px-6 py-4 text-center">{r.podios}</td>
                            <td className="px-6 py-4 text-right font-bold text-primary">{r.mejorPuesto}º</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
