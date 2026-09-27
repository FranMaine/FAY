import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, SailboatIcon } from "lucide-react";
import prisma from "@/lib/db";
import { slugificar } from "@/lib/slug";
import { CampeonatoCard, type Campeonato } from "@/components/ui/campeonato-card";

// Mismo criterio que /campeonatos/[id] y /clubes/[id]: sin esto la página
// queda cacheada estática para siempre.
export const revalidate = 60;

type Props = { params: Promise<{ anio: string; slug: string }> };

// El evento no es una entidad propia en la base (es un agrupado por
// nombre+año de varios Campeonato, ver campeonatos-agrupados.tsx) -para
// resolver la URL se traen los campeonatos de ese año y se compara el
// slug de cada nombre de evento hasta encontrar el que coincide, en vez
// de guardar un slug fijo que quedaría desactualizado si el nombre cambia.
async function getEvento(anioParam: string, slug: string) {
  const anio = parseInt(anioParam, 10);
  if (!Number.isFinite(anio)) return null;

  const campeonatosDb = await prisma.campeonato.findMany({
    where: { anio, estado: "PUBLICADO" },
    include: { clase: true, sede: true },
    orderBy: { nombre: "asc" },
  });

  const items = campeonatosDb.filter((c) => slugificar(c.evento?.trim() || c.nombre) === slug);
  if (items.length === 0) return null;

  const resultados = await prisma.resultado.findMany({
    where: { regata: { campeonatoId: { in: items.map((c) => c.id) } } },
    select: { regatistaId: true, regata: { select: { campeonatoId: true } } },
  });
  const inscriptosPorCampeonato = new Map<string, Set<string>>();
  for (const r of resultados) {
    const campId = r.regata.campeonatoId;
    if (!inscriptosPorCampeonato.has(campId)) inscriptosPorCampeonato.set(campId, new Set());
    inscriptosPorCampeonato.get(campId)!.add(r.regatistaId);
  }

  const nombre = items[0].evento?.trim() || items[0].nombre;
  const logoUrl = items.find((c) => c.logoUrl)?.logoUrl ?? null;

  const categorias: Campeonato[] = items.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    evento: c.evento,
    anio: c.anio,
    clase: c.clase.nombre,
    sede: c.sede?.nombre || "Sin sede",
    totalRegatistas: inscriptosPorCampeonato.get(c.id)?.size || 0,
    estado: c.estado,
    fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString().split("T")[0] : `${c.anio}-01-01`,
    logoUrl: c.logoUrl,
  }));

  return { nombre, anio, logoUrl, categorias };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { anio, slug } = await params;
  const evento = await getEvento(anio, slug);
  if (!evento) return { title: "Evento no encontrado" };
  return {
    title: `${evento.nombre} ${evento.anio}`,
    description: `Categorías y resultados de ${evento.nombre} ${evento.anio}, campeonato de vela de Argentina.`,
  };
}

export default async function EventoPage({ params }: Props) {
  const { anio, slug } = await params;
  const evento = await getEvento(anio, slug);
  if (!evento) notFound();

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <Link href="/campeonatos">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors -ml-1">
              <ArrowLeftIcon className="w-4 h-4" /> Volver a campeonatos
            </span>
          </Link>
        </div>

        <header className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-surface to-surface p-6 md:p-10">
          {evento.logoUrl ? (
            <Image src={evento.logoUrl} alt="" width={200} height={200} className="h-24 w-24 shrink-0 object-contain md:h-28 md:w-28" />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary md:h-28 md:w-28">
              <SailboatIcon className="h-10 w-10" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{evento.nombre}</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              {evento.anio} · {evento.categorias.length} categoría{evento.categorias.length === 1 ? "" : "s"}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {evento.categorias.map((c) => (
            <CampeonatoCard key={c.id} campeonato={c} />
          ))}
        </div>
      </div>
    </main>
  );
}
