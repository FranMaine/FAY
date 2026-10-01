import type { Metadata } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MedalIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ClaseIcon } from "@/components/icons/clase-icons";
import { slugificar } from "@/lib/slug";
import { CLUB_ALIASES } from "@/lib/club-aliases";

// Mismo criterio que /clubes/[id]: sin esto la página queda cacheada
// estática para siempre.
export const revalidate = 60;

type Props = { params: Promise<{ id: string; clase: string }> };

// La clase no es una entidad propia en la URL (no tiene id propio acá):
// se resuelve comparando el slug contra el nombre real de cada clase en la
// que compitió algún regatista del club, mismo patrón que
// /campeonatos/evento/[anio]/[slug] resuelve el nombre del evento.
async function getDatos(clubId: string, claseSlug: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return null;

  // Mismo alcance que getStatsDelClub en /clubes/[id]/page.tsx: solo los
  // resultados propios de los regatistas del club, no el árbol completo de
  // cada campeonato (ver el comentario ahí sobre por qué).
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
      regata: { select: { campeonato: { select: { clase: { select: { nombre: true } } } } } },
    },
  });

  const deLaClase = resultados.filter((r) => slugificar(r.regata.campeonato.clase.nombre) === claseSlug);
  if (deLaClase.length === 0) return null;
  const claseNombre = deLaClase[0].regata.campeonato.clase.nombre;

  const porRegatista = new Map<
    string,
    { regatistaId: string; nombre: string; resultados: number; victorias: number; podios: number; mejorPuesto: number }
  >();
  for (const r of deLaClase) {
    const puesto = r.puestoOficial ?? r.puesto;
    if (!porRegatista.has(r.regatistaId)) {
      porRegatista.set(r.regatistaId, { regatistaId: r.regatistaId, nombre: r.regatista.nombre, resultados: 0, victorias: 0, podios: 0, mejorPuesto: Infinity });
    }
    const reg = porRegatista.get(r.regatistaId)!;
    reg.resultados += 1;
    if (puesto === 1) reg.victorias += 1;
    if (puesto <= 3) reg.podios += 1;
    reg.mejorPuesto = Math.min(reg.mejorPuesto, puesto);
  }

  const regatistas = [...porRegatista.values()].sort(
    (a, b) => b.victorias - a.victorias || b.podios - a.podios || b.resultados - a.resultados
  );

  return { club, claseNombre, regatistas };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, clase } = await params;
  const datos = await getDatos(id, clase);
  if (!datos) return { title: "No encontrado" };
  const aliasClub = datos.club.nombreCompleto || CLUB_ALIASES[datos.club.nombre] || datos.club.nombre;
  return {
    title: `${datos.claseNombre} - ${datos.club.nombre}`,
    description: `Regatistas de ${aliasClub} que compitieron en ${datos.claseNombre}.`,
  };
}

export default async function ClubCategoriaPage({ params }: Props) {
  const { id, clase } = await params;
  const datos = await getDatos(id, clase);
  if (!datos) notFound();
  const { club, claseNombre, regatistas } = datos;

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link href={`/clubes/${club.id}`}>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors -ml-1">
              <ArrowLeftIcon className="w-4 h-4" /> Volver a {club.nombre}
            </span>
          </Link>
        </div>

        <header className="flex flex-col gap-4 rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-surface to-surface p-6 sm:flex-row sm:items-center md:p-10">
          <ViewTransition name={`club-categoria-${club.id}-${clase}`} share="morph" default="none">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
              <ClaseIcon nombreClase={claseNombre} className="h-9 w-9 object-contain" />
            </span>
          </ViewTransition>
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{claseNombre}</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              {club.nombre} · {regatistas.length} regatista{regatistas.length === 1 ? "" : "s"}
            </p>
          </div>
        </header>

        <Card className="bg-surface border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">Regatista</th>
                    <th scope="col" className="px-6 py-4 font-medium text-center">Resultados</th>
                    <th scope="col" className="px-6 py-4 font-medium text-center">Victorias</th>
                    <th scope="col" className="px-6 py-4 font-medium text-center">Podios</th>
                    <th scope="col" className="px-6 py-4 font-medium text-right">Mejor puesto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {regatistas.map((r) => (
                    <tr key={r.regatistaId} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/regatistas/${r.regatistaId}`} className="hover:text-primary transition-colors">
                          {r.nombre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center">{r.resultados}</td>
                      <td className="px-6 py-4 text-center">{r.victorias}</td>
                      <td className="px-6 py-4 text-center">{r.podios}</td>
                      <td className="px-6 py-4 text-right font-bold text-primary flex items-center justify-end gap-1.5">
                        <MedalIcon className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        {r.mejorPuesto}º
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
