import Link from "next/link";
import { Trophy, BarChart3, Medal, Sailboat, ArrowRight, ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { SailorSearch } from "@/components/search/sailor-search";

// Obtener los últimos 3 campeonatos para la home
async function getUltimosCampeonatos() {
  return prisma.campeonato.findMany({
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

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-surface z-0"></div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-8 flex flex-col items-center w-full">
          <div className="p-3 bg-surface rounded-full shadow-xl shadow-blue-900/20 mb-2 ring-1 ring-border">
            <Sailboat className="w-10 h-10 text-primary" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              FAY <span className="text-primary">Stats</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
              Ranking Nacional, resultados históricos y perfiles de regatistas de Argentina.
            </p>
          </div>

          <div className="w-full py-6">
            <SailorSearch />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link href="/rankings">
              <Button size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
                <Trophy className="w-5 h-5 mr-2" />
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

      {/* Stats Bar */}
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

      {/* Latest Championships */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Últimos Resultados</h2>
          <Link href="/campeonatos" className="text-primary hover:underline font-medium flex items-center">
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campeonatos.map((camp) => (
            <Card key={camp.id} className="bg-surface border-border hover:border-primary/50 transition-colors group">
              <Link href={`/campeonatos/${camp.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
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
          ))}
          {campeonatos.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground bg-surface rounded-xl border border-dashed border-border">
              Aún no hay campeonatos publicados.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
