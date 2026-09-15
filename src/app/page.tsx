import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Trophy, ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  // Sin "title" acá, el template del layout raíz ("%s | FAY Stats") lo
  // duplicaría en la home ("FAY Stats | FAY Stats"). El layout ya define
  // el default correcto para "/" -acá solo agregamos una descripción más
  // específica que la genérica del layout.
  description: "Ranking Nacional, resultados históricos y perfiles de regatistas de vela de Argentina, con datos oficiales de la Federación Argentina de Yachting.",
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

// Obtener estadísticas globales
async function getStats() {
  const [totalRegatistas, totalCampeonatos] = await Promise.all([
    prisma.regatista.count(),
    prisma.campeonato.count(),
  ]);
  return { totalRegatistas, totalCampeonatos };
}

export default async function LandingPage() {
  const campeonatos = await getUltimosCampeonatos();
  const stats = await getStats();
  const tieneFotoHero = fs.existsSync(FOTO_HERO_PATH);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section: foto de fondo a pantalla completa con el buscador
          encima -mientras no tengamos la foto, un degradé hace de
          placeholder (mismo lugar, mismo overlay), así que agregar el
          archivo en public/hero/velero-hero.jpg alcanza para que se use
          sin tocar este componente. El texto entra con la misma animación
          (fade-in-up) escalonada elemento por elemento, arriba del
          pliegue así que dispara apenas carga. */}
      <section className="relative min-h-[560px] md:min-h-[640px] flex items-center justify-center overflow-hidden text-white">
        {tieneFotoHero ? (
          // Es la imagen más grande de la página (LCP) -next/image con
          // priority la precarga y la sirve en el formato más liviano que
          // soporte el navegador (webp/avif) en vez de bajar siempre el
          // jpg de origen entero.
          <Image
            src="/hero/velero-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover z-0"
            aria-hidden="true"
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-sky-700 via-blue-800 to-slate-900" aria-hidden="true" />
        )}
        {/* Oscurece el fondo lo justo para que el texto blanco quede
            legible sin importar qué tan clara sea la escena del video. */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/70 via-black/25 to-black/40" aria-hidden="true" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center space-y-8">
          <h1 className="fade-in-up text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight" style={{ animationDelay: '80ms' }}>
            FAY <span className="text-sky-300">Stats</span>
          </h1>
          <p className="fade-in-up text-lg sm:text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-light" style={{ animationDelay: '160ms' }}>
            Ranking Nacional, resultados históricos y perfiles de regatistas de Argentina.
          </p>

          <div className="fade-in-up w-full py-2" style={{ animationDelay: '240ms' }}>
            <SailorSearch />
          </div>

          <div className="fade-in-up flex flex-col sm:flex-row gap-4 mt-2" style={{ animationDelay: '320ms' }}>
            <Link href="/rankings">
              <Button size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
                <Trophy className="w-5 h-5 mr-2" />
                Ver Rankings Oficiales
              </Button>
            </Link>
            <Link href="/campeonatos">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto border-white/70 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white"
              >
                Explorar Campeonatos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <ScrollReveal>
        <section className="border-y border-border bg-surface/50 py-10 px-6 relative z-10">
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
