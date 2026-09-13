import Link from "next/link";
import { Trophy, ArrowRight, BarChart3 } from "lucide-react";
import { SailingBoat } from "@/components/icons/sailing-boat";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { SailorSearch } from "@/components/search/sailor-search";
import { ClaseMarquee } from "@/components/marquee/clase-marquee";
import { ClaseIcon, slugDeClase, type ClaseIconSlug } from "@/components/icons/clase-icons";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { ScrollCue } from "@/components/ui/scroll-cue";

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

// Obtener estadísticas globales
async function getStats() {
  const [totalRegatistas, totalCampeonatos] = await Promise.all([
    prisma.regatista.count(),
    prisma.campeonato.count(),
  ]);
  return { totalRegatistas, totalCampeonatos };
}

// De los 10 logos, 4 son un ícono pictórico (Optimist, Snipe, Star,
// Raptor) y 6 son el wordmark de texto de la clase/asociación (ILCA, J24,
// J70, F18, 420, 29er -el logo ES el nombre escrito). Para "flanquear" el
// CTA preferimos los pictóricos: si usáramos un wordmark ahí, quedaría el
// nombre de la clase escrito dos veces (una dentro del logo, otra en la
// etiqueta debajo).
const CLASES_PICTORICAS: ClaseIconSlug[] = ['optimist', 'snipe', 'star', 'raptor'];

// Dos clases para "flanquear" el CTA del hero (ver .cta más abajo) -dos
// logos reales asomando a los costados de los botones, cada uno linkeando
// a esa categoría ya filtrada en /campeonatos. Alfabético por nombre para
// que sea determinístico (no cambia en cada build/visita); si por algún
// motivo la base tiene menos de dos clases con ícono pictórico, caemos de
// vuelta a cualquier clase con ícono (mejor eso que no mostrar nada).
async function getClasesFlanqueo() {
  const clases = await prisma.clase.findMany({ orderBy: { nombre: 'asc' } });
  const conIcono = clases
    .map((c) => ({ id: c.id, nombre: c.nombre, slug: slugDeClase(c.nombre) }))
    .filter((c): c is { id: string; nombre: string; slug: ClaseIconSlug } => c.slug !== null);
  const pictoricas = conIcono.filter((c) => CLASES_PICTORICAS.includes(c.slug));
  const candidatas = pictoricas.length >= 2 ? pictoricas : conIcono;
  if (candidatas.length < 2) return null;
  return { izquierda: candidatas[0], derecha: candidatas[candidatas.length - 1] };
}

export default async function LandingPage() {
  const campeonatos = await getUltimosCampeonatos();
  const stats = await getStats();
  const flanqueo = await getClasesFlanqueo();

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section -cinematográfico: fondo con resplandor ambiente que
          deriva lentamente, titular en serif con reveal enmascarado, y dos
          logos de categoría "flanqueando" el CTA (asoman desde los
          costados, recortados por el overflow-hidden de la sección) que
          linkean directo a esa categoría en /campeonatos. El resto entra
          con la misma animación (fade-in-up) escalonada elemento por
          elemento, arriba del pliegue así que dispara apenas carga (no
          hace falta ScrollReveal/IntersectionObserver acá, ya está a la
          vista). */}
      <section className="relative px-6 py-20 md:py-32 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-surface z-0"></div>
        <div className="ambient-glow absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div className="ambient-blob absolute left-1/2 top-[38%] w-[560px] h-[560px] max-w-[140vw] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-8 flex flex-col items-center w-full">
          <div className="fade-in-up p-3 bg-surface rounded-full shadow-xl shadow-blue-900/20 mb-2 ring-1 ring-border">
            <SailingBoat className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-4">
            <p className="fade-in-up text-xs sm:text-sm font-semibold uppercase tracking-[0.35em] text-primary/80" style={{ animationDelay: '60ms' }}>
              Federación Argentina de Yachting
            </p>
            <h1 className="hero-reveal-mask text-5xl md:text-7xl font-extrabold tracking-tight font-serif">
              <span className="hero-reveal-line" style={{ animationDelay: '140ms' }}>
                FAY <span className="text-primary">Stats</span>
              </span>
            </h1>
            <div className="fade-in-up flex justify-center pt-1" style={{ animationDelay: '260ms' }}>
              <span className="h-1 w-16 rounded-full bg-primary" />
            </div>
            <p className="fade-in-up text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light" style={{ animationDelay: '320ms' }}>
              Ranking Nacional, resultados históricos y perfiles de regatistas de Argentina.
            </p>
          </div>

          <div className="fade-in-up w-full py-6" style={{ animationDelay: '400ms' }}>
            <SailorSearch />
          </div>

          <div className="fade-in-up relative flex flex-col sm:flex-row items-center justify-center gap-4 mt-4" style={{ animationDelay: '480ms' }}>
            {flanqueo && (
              <Link
                href={`/campeonatos?clase=${flanqueo.izquierda.id}`}
                className="hidden lg:flex flex-col items-center gap-1.5 absolute right-full mr-8 top-1/2 -translate-y-1/2 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/logos-categorias/${flanqueo.izquierda.slug}.png`}
                  alt=""
                  className="w-20 h-20 object-contain opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-[opacity,transform] duration-300 ease-out"
                />
                <span className="font-serif text-sm text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                  {flanqueo.izquierda.nombre}
                </span>
              </Link>
            )}

            <Link href="/rankings">
              <Button size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                <Trophy className="w-5 h-5 mr-2" />
                Ver Rankings Oficiales
              </Button>
            </Link>
            <Link href="/campeonatos">
              <Button variant="outline" size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
                Explorar Campeonatos
              </Button>
            </Link>

            {flanqueo && (
              <Link
                href={`/campeonatos?clase=${flanqueo.derecha.id}`}
                className="hidden lg:flex flex-col items-center gap-1.5 absolute left-full ml-8 top-1/2 -translate-y-1/2 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/logos-categorias/${flanqueo.derecha.slug}.png`}
                  alt=""
                  className="w-20 h-20 object-contain opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-[opacity,transform] duration-300 ease-out"
                />
                <span className="font-serif text-sm text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                  {flanqueo.derecha.nombre}
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="fade-in-up absolute bottom-6 left-1/2 -translate-x-1/2 z-10" style={{ animationDelay: '620ms' }}>
          <ScrollCue target="stats-bar" />
        </div>
      </section>

      {/* Stats Bar */}
      <ScrollReveal>
        <section id="stats-bar" className="border-y border-border bg-surface/50 py-10 px-6 relative z-10 scroll-mt-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="flex flex-col items-center pt-4 md:pt-0">
              <div className="text-4xl font-bold text-foreground mb-2">{stats.totalRegatistas}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Regatistas</div>
            </div>
            <div className="flex flex-col items-center pt-4 md:pt-0">
              <div className="text-4xl font-bold text-primary mb-2">{stats.totalCampeonatos}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Campeonatos</div>
            </div>
            <div className="flex flex-col items-center pt-4 md:pt-0">
              <div className="text-4xl font-bold text-amber-500 mb-2">ISAF</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Scoring System</div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Franja de categorías: qué clases de barco tiene cargadas el sitio,
          antes de mostrar los últimos resultados. */}
      <ClaseMarquee />

      {/* Latest Championships */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full relative z-10">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Últimos Resultados</h2>
            <Link href="/campeonatos" className="group text-primary hover:underline font-medium flex items-center">
              Ver todos <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campeonatos.map((camp, i) => (
            <ScrollReveal key={camp.id} delay={i * 80}>
              <Card className="bg-surface border-border hover:border-primary/50 hover:-translate-y-1 transition-[transform,border-color] group">
                <Link href={`/campeonatos/${camp.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
                        <ClaseIcon nombreClase={camp.clase.nombre} className="w-5 h-5 shrink-0" />
                        {camp.clase.nombre}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">{camp.anio}</span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                      {camp.nombre}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-2">
                      {camp.sede?.nombre || "Sin sede"}
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </ScrollReveal>
          ))}
          {campeonatos.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground bg-surface rounded-xl border border-dashed border-border">
              Aún no hay campeonatos publicados.
            </div>
          )}
        </div>
      </section>

      {/* CTA repetido -el mismo llamado a la acción del hero, de nuevo al
          final del recorrido. Alguien que llegó hasta acá scrolleando ya
          vio de qué se trata el sitio; repetir el CTA en vez de dejar que
          tenga que volver arriba a buscarlo es lo que reduce fricción en
          páginas largas. */}
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
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Ver Rankings Oficiales
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
