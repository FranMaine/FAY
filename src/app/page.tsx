import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Trophy, ArrowRight, BarChart3, Building2, Medal, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { SailorSearch } from "@/components/search/sailor-search";
import { ClaseMarquee } from "@/components/marquee/clase-marquee";
import { ClaseIcon } from "@/components/icons/clase-icons";
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
  // Sin "title" acá, el template del layout raíz ("%s | Regateando") lo
  // duplicaría en la home ("Regateando | Regateando"). El layout ya define
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

export default async function LandingPage() {
  const campeonatos = await getUltimosCampeonatos();
  const stats = await getStats();
  const tieneFotoHero = fs.existsSync(FOTO_HERO_PATH);
  const [destacado, ...otros] = campeonatos;

  const numeros = [
    { valor: stats.totalRegatistas.toLocaleString("es-AR"), etiqueta: "Regatistas" },
    { valor: stats.totalCampeonatos.toLocaleString("es-AR"), etiqueta: "Campeonatos" },
    { valor: stats.totalClubes.toLocaleString("es-AR"), etiqueta: "Clubes" },
    {
      valor: stats.desde && stats.hasta ? (stats.desde === stats.hasta ? `${stats.desde}` : `${stats.desde}–${stats.hasta}`) : "–",
      etiqueta: "Temporadas",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
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
              <Link href="/campeonatos">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full font-semibold px-7 h-12 border-white/70 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white"
                >
                  Explorar Campeonatos
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
            <Link href="/rankings" className="group relative flex h-full min-h-[260px] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/25 via-surface to-surface p-8 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/60">
              <BarChart3 className="absolute right-6 top-6 w-24 h-24 text-primary/15 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
              <h3 className="text-3xl font-bold tracking-tight">Rankings</h3>
              <p className="mt-2 max-w-md text-muted-foreground">Quién va primero en cada clase, por temporada o de todos los años.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-medium text-primary">
                Ver rankings <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <Link href="/clubes" className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/60">
              <Building2 className="w-8 h-8 text-primary" aria-hidden="true" />
              <div className="mt-6">
                <h3 className="text-xl font-bold">Clubes</h3>
                <p className="text-sm text-muted-foreground">{stats.totalClubes.toLocaleString("es-AR")} clubes con sus regatistas y escudos.</p>
              </div>
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <Link href="/campeonatos" className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/60">
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
              <Link href={`/campeonatos/${destacado.id}`} className="group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-border bg-surface p-8 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/60">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-md">
                    <ClaseIcon nombreClase={destacado.clase.nombre} className="w-6 h-6 shrink-0" />
                    {destacado.clase.nombre}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium tabular-nums">{destacado.anio}</span>
                </div>
                <div className="mt-8">
                  <h3 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-2">{destacado.nombre}</h3>
                  <p className="mt-2 text-muted-foreground">{destacado.sede?.nombre || "Sin sede"}</p>
                </div>
              </Link>
            </ScrollReveal>
            <div className="lg:col-span-2 flex flex-col gap-4">
              {otros.map((camp, i) => (
                <ScrollReveal key={camp.id} delay={(i + 1) * 80} className="flex-1">
                  <Link href={`/campeonatos/${camp.id}`} className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/60">
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <ClaseIcon nombreClase={camp.clase.nombre} className="w-5 h-5 shrink-0" />
                        {camp.clase.nombre}
                      </span>
                      <h3 className="mt-1 text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{camp.nombre}</h3>
                      <p className="text-sm text-muted-foreground truncate">{camp.sede?.nombre || "Sin sede"}</p>
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link href="/rankings">
                <Button size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
                  <BarChart3 className="w-5 h-5 mr-2" aria-hidden="true" />
                  Ver Rankings
                </Button>
              </Link>
              <Link href="/campeonatos">
                <Button variant="outline" size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
                  Explorar Campeonatos
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}
