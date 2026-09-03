import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PosicionHistorica } from "@/components/charts/posicion-historica";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";
import { MedalIcon, CalendarIcon, ArrowRightIcon } from "lucide-react";

async function getRegatistaStats(regatistaId: string) {
  const regatista = await prisma.regatista.findUnique({
    where: { id: regatistaId },
    include: {
      club: true,
      resultados: {
        include: {
          regata: {
            include: {
              campeonato: { include: { clase: true } }
            }
          }
        }
      }
    }
  });

  if (!regatista) return null;

  const campeonatosIds = new Set(regatista.resultados.map(r => r.regata.campeonatoId));
  const historial = [];
  const chartData = [];
  let mejorPuesto = 9999;
  let sumaPuestos = 0;

  for (const campId of campeonatosIds) {
    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campId },
      include: {
        clase: true,
        sede: true,
        regatas: {
          include: {
            resultados: { include: { regatista: { include: { club: true } } } }
          }
        }
      }
    });

    if (!campeonato || campeonato.estado !== "PUBLICADO") continue;

    const clasificacion = generarClasificacion(agruparPorRegatista(campeonato.regatas), campeonato.descartes);
    const miClasificacion = clasificacion.find(c => c.regatistaId === regatistaId);

    if (miClasificacion) {
      if (miClasificacion.posicionFinal < mejorPuesto) mejorPuesto = miClasificacion.posicionFinal;
      sumaPuestos += miClasificacion.posicionFinal;

      historial.push({
        campeonato,
        posicion: miClasificacion.posicionFinal,
        totalInscriptos: clasificacion.length,
        puntosNetos: miClasificacion.totalNeto,
      });

      chartData.push({
        campeonato: campeonato.nombre,
        posicion: miClasificacion.posicionFinal,
        anio: campeonato.anio,
        date: campeonato.fechaInicio || new Date(campeonato.anio, 0, 1),
      });
    }
  }

  historial.sort((a, b) => b.campeonato.anio - a.campeonato.anio);
  chartData.sort((a, b) => a.date.getTime() - b.date.getTime());

  const promedio = historial.length > 0 ? (sumaPuestos / historial.length).toFixed(1) : "-";
  if (mejorPuesto === 9999) mejorPuesto = 0;

  return { regatista, historial, chartData, mejorPuesto, promedio };
}

export default async function MiPerfilPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Refetch user to get the latest regatistaId if they just got linked
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isLinked = !!user?.regatistaId; 

  let stats = null;
  if (isLinked) {
    stats = await getRegatistaStats(user.regatistaId as string);
  } else {
    // Buscar si hay solicitud pendiente
    const solicitud = await prisma.solicitudVinculacion.findFirst({
      where: { userId: session.user.id, estado: 'PENDIENTE' }
    });
    if (solicitud) {
      return (
        <main className="min-h-screen bg-background p-6 md:p-10 flex items-start justify-center">
          <Card className="w-full max-w-lg bg-surface border-border mt-10 text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Solicitud en proceso</CardTitle>
              <CardDescription className="text-base mt-2">
                Tu solicitud de vinculación está siendo revisada por un administrador de FAY. Por favor, tené paciencia.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      );
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Mi Dashboard</h1>
            <p className="text-muted-foreground">{session.user.name || session.user.email}</p>
          </div>
          {isLinked && (
            <Badge variant="default" className="bg-primary text-primary-foreground">Perfil Vinculado</Badge>
          )}
        </header>

        {!isLinked || !stats ? (
          <Card className="bg-surface border-border border-dashed">
            <CardHeader className="text-center py-10">
              <CardTitle className="text-3xl mb-2">Reclamá tu perfil</CardTitle>
              <CardDescription className="text-lg max-w-md mx-auto">
                Conectá tu cuenta con tu perfil público de regatista para ver tus métricas, evolución histórica y gestionar tu información.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center pb-10">
              <Link href="/vincular">
                <Button size="lg" className="rounded-full px-8 text-lg h-12">
                  Buscar mi nombre
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Campeonatos Jugados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">{stats.historial.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Mejor Puesto General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">{stats.mejorPuesto > 0 ? `${stats.mejorPuesto}°` : '-'}</div>
                </CardContent>
              </Card>
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Promedio de Puesto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-amber-500">{stats.promedio}</div>
                </CardContent>
              </Card>
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Club Representado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground truncate">{stats.regatista.club?.nombre || 'Sin club'}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-surface border-border shadow-md">
                <CardHeader>
                  <CardTitle>Mi Evolución Histórica</CardTitle>
                  <CardDescription>Tu posición general en los campeonatos disputados</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {stats.chartData.length > 0 ? (
                    <PosicionHistorica data={stats.chartData} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                      No hay suficientes datos para graficar.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight">Mis Últimos Torneos</h2>
                  <Link href={`/regatistas/${stats.regatista.id}`} className="text-primary hover:underline flex items-center text-sm font-medium">
                    Ver mi perfil público <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {stats.historial.slice(0, 4).map((h) => {
                    const isPodium = h.posicion <= 3;
                    return (
                      <Link key={h.campeonato.id} href={`/campeonatos/${h.campeonato.id}`} className="block">
                        <Card className="bg-surface border-border hover:border-primary/50 transition-colors group">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPodium ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                                  {isPodium ? <MedalIcon className="w-5 h-5" /> : <span className="font-bold">#{h.posicion}</span>}
                                </div>
                                <div>
                                  <h3 className="font-bold group-hover:text-primary transition-colors line-clamp-1">{h.campeonato.nombre}</h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{h.campeonato.clase.nombre}</span>
                                    <span>•</span>
                                    <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1"/> {h.campeonato.anio}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xl font-black">{h.posicion}<span className="text-xs text-muted-foreground font-normal ml-1">/ {h.totalInscriptos}</span></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                  {stats.historial.length === 0 && (
                    <div className="text-center p-6 text-muted-foreground bg-surface rounded-xl border border-dashed border-border">
                      Aún no tenés campeonatos corridos.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
