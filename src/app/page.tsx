import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Trophy, ArrowRight, Building2, Medal, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { SailorSearch } from "@/components/search/sailor-search";
import { ClaseMarquee } from "@/components/marquee/clase-marquee";
import { ClaseIcon } from "@/components/icons/clase-icons";
import { clubesConMasPodios } from "@/lib/podios-clubes";
import { ClubAvatar } from "@/components/icons/club-avatar";
import { getRankingGeneral } from "@/lib/ranking-general";
import { PodioPortada, type PodioDeClase } from "@/components/ranking/podio-portada";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

// Foto de fondo del hero (ver sección HERO más abajo) -mientras no esté,
// el hero muestra un degradé como placeholder en su lugar. Es una foto
// real de la 51ª Semana Nacional del Yachting (crédito visible: Capizzano
// Photography), escalada a 1920px de ancho con
// scripts/upscale-hero-photo.ts. Si en algún momento aparece un archivo
// en mejor calidad, conviene reemplazar public/hero/velero-hero.jpg por
// ese (mismo nombre, mismo lugar, no hace falta tocar este archivo).
const FOTO_HERO_PATH = path.join(process.cwd(), "public", "hero", "velero-hero.jpg");

export const metadata: Metadata = {
  // Sin "title" acá, el template del layout raíz ("%s | Orzando") lo
  // duplicaría en la home ("Orzando | Orzando"). El layout ya define
  // el default correcto para "/" -acá solo agregamos una descripción más
  // específica que la genérica del layout.
  description: "Ranking Nacional, resultados históricos y perfiles de regatistas de vela de Argentina, con los resultados de los campeonatos de todo el país.",
};

// Sin esto, Next.js pre-renderiza esta página como HTML ESTÁTICO en cada
// deploy -los números de "Regatistas"/"Campeonatos" y la lista de últimos
// resultados quedan congelados con los datos de ese momento, sin
// actualizarse hasta el próximo deploy, aunque se cargue un campeonato
// nuevo un minuto después. Forzamos que se renderice en el servidor en
// cada visita, así siempre refleja el estado actual de la base.
export const dynamic = 'force-dynamic';

// Obtener los últimos 3 campeonatos para la home. Solo mostramos los que
// están PUBLICADOS -antes esto no filtraba, así que cualquier borrador
// creado por un admin aparecía en la home a la vista de todo el mundo.
async function getUltimosCampeonatos() {
  return prisma.campeonato.findMany({
    where: { estado: 'PUBLICADO' },
    take: 3,
    orderBy: { updatedAt: 'desc' },
    include: { clase: true, sede: true },
  });
}

// Estadísticas globales. Antes "Campeonatos" contaba también los borradores
// (número inflado respecto de lo que el público puede ver), y el tercer
// dato era un texto fijo ("ISAF / Scoring System") que no es un dato del
// sitio -ahora son todos números reales de la base.
async function getStats() {
  const [totalRegatistas, totalCampeonatos, totalClubes, rango] = await Promise.all([
    prisma.regatista.count(),
    prisma.campeonato.count({ where: { estado: 'PUBLICADO' } }),
    prisma.club.count(),
    prisma.campeonato.aggregate({ where: { estado: 'PUBLICADO' }, _min: { anio: true }, _max: { anio: true } }),
  ]);
  return {
    totalRegatistas,
    totalCampeonatos,
    totalClubes,
    desde: rango._min.anio,
    hasta: rango._max.anio,
  };
}

// Top 3 de cada clase con más campeonatos en la temporada más reciente (hasta
// 6 clases, para que el selector no se desborde). Las clases sin al menos 3
// regatistas rankeados quedan afuera: no alcanzan para armar un podio.
async function getPodiosPortada(anio: number | null): Promise<PodioDeClase[]> {
  if (!anio) return [];
  const porClase = await prisma.campeonato.groupBy({
    by: ['claseId'],
    where: { estado: 'PUBLICADO', anio },
    _count: { _all: true },
    orderBy: { _count: { claseId: 'desc' } },
    take: 6,
  });
  const clases = await prisma.clase.findMany({ where: { id: { in: porClase.map((c) => c.claseId) } } });
  const nombre = new Map(clases.map((c) => [c.id, c.nombre]));
  const podios = await Promise.all(
    porClase.map(async ({ claseId }): Promise<PodioDeClase | null> => {
      const ranking = await getRankingGeneral(claseId, anio);
      if (ranking.length < 3) return null;
      return {
        claseId,
        clase: nombre.get(claseId) ?? '',
        items: ranking.slice(0, 3).map((r) => ({ id: r.id, href: `/regatistas/${r.id}`, titulo: r.nombre, subtitulo: r.club, puntos: r.puntosRanking })),
      };
    })
  );
  return podios.filter((p): p is PodioDeClase => p !== null);
}

export default async function LandingPage() {
  const [campeonatos, stats, topClubes] = await Promise.all([getUltimosCampeonatos(), getStats(), clubesConMasPodios(5)]);
  const podios = await getPodiosPortada(stats.hasta);
  const tieneFotoHero = fs.existsSync(FOTO_HERO_PATH);
  const [destacado, ...otros] = campeonatos;

  const numeros = [
    { valor: stats.totalRegatistas.toLocaleString("es-AR"), etiqueta: "Regatistas" },
    { valor: stats.totalCampeonatos.toLocaleString("es-AR"), etiqueta: "Campeonatos" },
    { valor: stats.totalClubes.toLocaleString("es-AR"), etiqueta: "Clubes" },
    {
      valor: stats.desde && stats.hasta ? (stats.desde === stats.hasta ? `${stats.desde}` : `${stats.desde}-${stats.hasta}`) : "-",
      etiqueta: "Temporadas",
    },
  ];

  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Hero: alineado a la izquierda con la foto visible a la derecha
          (antes: todo centrado sobre un fondo oscuro parejo, donde la foto
          casi no se notaba). El degradé va de izquierda a derecha -oscuro
          donde está el texto, transparente donde está el velero- así el
          texto sigue legible sin apagar la foto entera. */}
      <section className="relative min-h-[600px] md:min-h-[680px] flex items-center overflow-hidden text-white">
        {tieneFotoHero ? (
          <Image
            src="/hero/velero-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center] z-0"
            aria-hidden="true"
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-sky-700 via-blue-800 to-slate-900" aria-hidden="true" />
        )}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-40 z-0 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl space-y-7">
            <p className="fade-in-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest backdrop-blur-sm" style={{ animationDelay: '40ms' }}>
              <Medal className="w-3.5 h-3.5" aria-hidden="true" /> Estadísticas de vela argentina
            </p>
            <h1 className="fade-in-up text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.02] [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]" style={{ animationDelay: '100ms' }}>
              Cada regata,<br />
              <span className="text-sky-300">cada regatista.</span>
            </h1>
            <p className="fade-in-up text-lg md:text-xl text-white/90 max-w-xl [text-shadow:0_1px_14px_rgba(0,0,0,0.7)]" style={{ animationDelay: '170ms' }}>
              Rankings, resultados históricos y perfiles de los regatistas de todo el país. Buscá tu nombre y mirá cómo te fue.
            </p>

            <div className="fade-in-up max-w-xl" style={{ animationDelay: '240ms' }}>
              <SailorSearch />
            </div>

            <div className="fade-in-up flex flex-wrap gap-3 pt-1" style={{ animationDelay: '310ms' }}>
              <Link href="/rankings">
                <Button size="lg" className="rounded-full font-semibold px-7 h-12">
                  <Trophy className="w-5 h-5 mr-2" aria-hidden="true" />
                  Ver Rankings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Números reales, en una franja que sube sobre el borde del hero. */}
      <ScrollReveal>
        <section className="relative z-10 -mt-14 px-6">
          <dl className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-xl">
            {numeros.map((n) => (
              <div key={n.etiqueta} className="bg-surface px-6 py-6 text-center md:text-left">
                <dd className="text-3xl md:text-4xl font-bold tracking-tight tabular-nums">{n.valor}</dd>
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted-foreground font-medium">{n.etiqueta}</dt>
              </div>
            ))}
          </dl>
        </section>
      </ScrollReveal>

      {/* Franja de categorías: qué clases de barco tiene cargadas el sitio. */}
      <div className="mt-14">
        <ClaseMarquee />
      </div>

      {/* Explorar: tres accesos con distinto peso (Rankings es lo más usado),
          en vez de tres tarjetas idénticas. */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <ScrollReveal>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Explorá</h2>
          <p className="text-muted-foreground mb-8">Tres formas de entrar a los datos.</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4">
          <ScrollReveal className="md:col-span-2 md:row-span-2">
            {podios.length > 0 ? (
              <PodioPortada podios={podios} anio={stats.hasta!} />
            ) : (
              <Link href="/rankings" className="group flex h-full min-h-[260px] flex-col justify-end rounded-2xl border border-border bg-surface p-8 transition-[transform,border-color] duration-200 ease-out-strong hover:-translate-y-1 active:scale-[0.985] hover:border-primary/60">
                <h3 className="text-3xl font-bold tracking-tight">Rankings</h3>
                <p className="mt-2 max-w-md text-muted-foreground">Quién va primero en cada clase, por temporada o de todos los años.</p>
              </Link>
            )}
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <Link href="/clubes" className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-[transform,border-color] duration-200 ease-out-strong hover:-translate-y-1 active:scale-[0.985] hover:border-primary/60">
              <Building2 className="w-8 h-8 text-primary" aria-hidden="true" />
              <div className="mt-6">
                <h3 className="text-xl font-bold">Clubes</h3>
                <p className="text-sm text-muted-foreground">{stats.totalClubes.toLocaleString("es-AR")} clubes con sus regatistas y escudos.</p>
              </div>
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <Link href="/campeonatos" className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-[transform,border-color] duration-200 ease-out-strong hover:-translate-y-1 active:scale-[0.985] hover:border-primary/60">
              <CalendarDays className="w-8 h-8 text-primary" aria-hidden="true" />
              <div className="mt-6">
                <h3 className="text-xl font-bold">Campeonatos</h3>
                <p className="text-sm text-muted-foreground">{stats.totalCampeonatos.toLocaleString("es-AR")} campeonatos con su tabla completa.</p>
              </div>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Últimos resultados: el más reciente destacado y el resto al costado. */}
      <section className="pb-20 px-6 max-w-7xl mx-auto w-full">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Últimos resultados</h2>
            <Link href="/campeonatos" className="group text-primary hover:underline font-medium flex items-center">
              Ver todos <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>

        {destacado ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ScrollReveal className="lg:col-span-3">
              <Link href={`/campeonatos/${destacado.id}`} className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-border bg-surface p-8 transition-[transform,border-color] duration-200 ease-out-strong hover:-translate-y-1 active:scale-[0.985] hover:border-primary/60">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-md">
                    <ClaseIcon nombreClase={destacado.clase.nombre} className="w-6 h-6 shrink-0" />
                    {destacado.clase.nombre}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium tabular-nums">{destacado.anio}</span>
                </div>
                <div className="mt-8">
                  <h3 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-2">{destacado.nombre}</h3>
                  {destacado.sede?.nombre && <p className="mt-2 text-muted-foreground">{destacado.sede.nombre}</p>}
                </div>
              </Link>
            </ScrollReveal>
            <div className="lg:col-span-2 flex flex-col gap-4">
              {otros.map((camp, i) => (
                <ScrollReveal key={camp.id} delay={(i + 1) * 80} className="flex-1">
                  <Link href={`/campeonatos/${camp.id}`} className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition-[transform,border-color] duration-200 ease-out-strong hover:-translate-y-0.5 active:scale-[0.985] hover:border-primary/60">
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <ClaseIcon nombreClase={camp.clase.nombre} className="w-5 h-5 shrink-0" />
                        {camp.clase.nombre}
                      </span>
                      <h3 className="mt-1 text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{camp.nombre}</h3>
                      {camp.sede?.nombre && <p className="text-sm text-muted-foreground truncate">{camp.sede.nombre}</p>}
                    </div>
                    <span className="text-sm text-muted-foreground font-medium tabular-nums shrink-0">{camp.anio}</span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground bg-surface rounded-xl border border-dashed border-border">
            Aún no hay campeonatos publicados.
          </div>
        )}
      </section>

      {/* Clubes con más podios: datos reales de la base, con los escudos ya cargados. */}
      {topClubes.length > 0 && (
        <section className="px-6 pb-20 max-w-7xl mx-auto w-full">
          <ScrollReveal>
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Clubes con más podios</h2>
                <p className="mt-2 text-muted-foreground">Podios de sus regatistas en todos los campeonatos cargados.</p>
              </div>
              <Link href="/rankings/clubes" className="group hidden sm:flex shrink-0 items-center font-medium text-primary hover:underline">
                Ranking de clubes <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <ol className="overflow-hidden rounded-2xl border border-border bg-surface divide-y divide-border">
              {topClubes.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/clubes/${c.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                    <span className="w-6 text-center text-lg font-extrabold tabular-nums text-muted-foreground">{i + 1}</span>
                    <ClubAvatar nombre={c.nombre} logoUrl={c.logoUrl} className="w-10 h-10 text-sm" pixeles={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold group-hover:text-primary transition-colors">{c.nombre}</span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-border">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(6, Math.round((c.podios / topClubes[0].podios) * 100))}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-2xl font-extrabold tabular-nums leading-none">{c.podios}</span>
                      <span className="text-xs text-muted-foreground">podios{c.victorias > 0 ? `, ${c.victorias} en el 1º` : ""}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </section>
      )}

      {/* CTA final: el mismo llamado del hero, de nuevo al final del recorrido. */}
      <ScrollReveal>
        <section className="px-6 py-20 border-t border-border bg-surface/30">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              ¿Buscás cómo te fue en tu última regata?
            </h2>
            <p className="text-muted-foreground text-lg">
              Encontrá tu historial completo, comparado con el resto de la flota.
            </p>
            <div className="flex justify-center pt-2">
              <Link href="/registro">
                <Button size="lg" className="rounded-full font-semibold px-8 h-12">
                  Crear mi cuenta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}
