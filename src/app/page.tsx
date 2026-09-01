import Link from "next/link";
import { Trophy, BarChart3, Medal, Sailboat, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-surface z-0"></div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 flex flex-col items-center">
          <div className="p-3 bg-surface rounded-full shadow-xl shadow-blue-900/20 mb-4 ring-1 ring-border">
            <Sailboat className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">FAY Stats</h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
            Todas las estadísticas de la vela argentina en un solo lugar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
            <Link href="/campeonatos" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-lg">
                Ver Campeonatos <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/registro" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-lg">
                Crear Cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-surface/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-surface border-border">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>
                  Consultá los resultados de todos los campeonatos FAY
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-surface border-border">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Estadísticas</CardTitle>
                <CardDescription>
                  Seguí tu evolución y compará tu rendimiento
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-surface border-border">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Medal className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle>Rankings</CardTitle>
                <CardDescription>
                  Mirá los rankings generales por clase y temporada
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Últimos Campeonatos */}
      <section className="px-6 py-20 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Últimos Campeonatos</h2>
            <Link href="/campeonatos">
              <Button variant="ghost">
                Ver Todos <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-dashed border-border rounded-xl">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Próximamente</h3>
            <p className="text-muted-foreground max-w-md">
              Los campeonatos publicados aparecerán aquí una vez que haya datos disponibles en el sistema.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

