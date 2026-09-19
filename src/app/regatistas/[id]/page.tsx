import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { generarClasificacion, agruparPorRegatista } from "@/lib/scoring";
import { PosicionHistorica } from "@/components/charts/posicion-historica";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, TrophyIcon, MapPinIcon, CalendarIcon, MedalIcon, UserIcon } from "lucide-react";
import { CsvDownloadButton } from "@/components/ui/csv-download-button";

// Mismo caso que /campeonatos/[id]: sin esto, el perfil queda cacheado
// estático para siempre después de la primera visita -si esa persona
// corre una nueva regata, nadie ve el resultado nuevo en su perfil hasta
// el próximo deploy. ISR de 60s, igual que el resto de las páginas que
// muestran datos que cambian.
export const revalidate = 60;

async function getRegatistaProfile(id: string) {
  const regatista = await prisma.regatista.findUnique({
    where: { id },
    include: {
      club: true,
      resultados: {
        include: {
          regata: {
            include: {
              campeonato: {
                include: {
                  clase: true,
                  sede: true,
                }
              }
            }
          }
        }
      }
    }
  });

  if (!regatista) return null;

  // Encontrar todos los campeonatos únicos en los que participó
  const campeonatosIds = new Set(regatista.resultados.map(r => r.regata.campeonatoId));
  const historial = [];
  const chartData = [];

  for (const campId of campeonatosIds) {
    // Para saber su posición final, necesitamos calcular la clasificación de todo el campeonato
    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campId },
      include: {
        clase: true,
        sede: true,
        regatas: {
          include: {
            resultados: {
              include: {
                regatista: { include: { club: true } }
              }
            }
          }
        }
      }
    });

    if (!campeonato || campeonato.estado !== "PUBLICADO") continue;

    const clasificacion = generarClasificacion(agruparPorRegatista(campeonato.regatas), campeonato.descartes);
    const miClasificacion = clasificacion.find(c => c.regatistaId === id);

    if (miClasificacion) {
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

  // Ordenar historial cronológicamente (más nuevo primero)
  historial.sort((a, b) => b.campeonato.anio - a.campeonato.anio);
  
  // Ordenar chartData cronológicamente (más viejo primero para el gráfico)
  chartData.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { regatista, historial, chartData };
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const regatista = await prisma.regatista.findUnique({
    where: { id },
    select: { nombre: true, club: { select: { nombre: true } } },
  });

  if (!regatista) return { title: "Regatista no encontrado" };

  const club = regatista.club?.nombre;
  return {
    title: regatista.nombre,
    description: `Historial de resultados de ${regatista.nombre}${club ? ` (${club})` : ""} en campeonatos de vela de Argentina.`,
  };
}

export default async function RegatistaProfilePage({ params }: Props) {
  const { id } = await params;
  const data = await getRegatistaProfile(id);

  if (!data) {
    notFound();
  }

  const { regatista, historial, chartData } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: regatista.nombre,
    nationality: regatista.pais || undefined,
    memberOf: regatista.club ? { "@type": "SportsOrganization", name: regatista.club.nombre } : undefined,
    url: `${SITE_URL}/regatistas/${regatista.id}`,
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 -ml-3 text-muted-foreground">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
            <div className="flex items-center gap-6">
              {regatista.fotoUrl ? (
                <Image
                  src={regatista.fotoUrl}
                  alt={regatista.nombre}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-background shadow-xl shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary ring-4 ring-background shadow-xl shrink-0">
                  <UserIcon className="w-12 h-12" />
                </div>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{regatista.nombre}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium">
                  {regatista.club && (
                    <span className="flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      {regatista.club.nombre}
                    </span>
                  )}
                  {regatista.pais && (
                    <span className="px-2 py-0.5 bg-muted text-white rounded-full">
                      {regatista.pais}
                    </span>
                  )}
                  {historial.length > 0 && (
                    <span className="flex items-center">
                      <TrophyIcon className="w-4 h-4 mr-1" />
                      {historial.length} Campeonatos
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {historial.length === 0 ? (
          <Card className="bg-surface border-border text-center py-12">
            <CardContent>
              <div className="text-muted-foreground">Este regatista aún no tiene resultados publicados.</div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Gráfico de Evolución */}
            <Card className="bg-surface border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Evolución Histórica</CardTitle>
                <CardDescription>Posición final a lo largo del tiempo</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <PosicionHistorica data={chartData} />
              </CardContent>
            </Card>

            {/* Historial de Campeonatos */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Historial de Resultados</h2>
                <CsvDownloadButton
                  filename={`${regatista.nombre} - historial.csv`}
                  headers={["Campeonato", "Año", "Clase", "Posición", "Inscriptos", "Puntos Netos"]}
                  rows={historial.map((h) => [
                    h.campeonato.nombre,
                    h.campeonato.anio,
                    h.campeonato.clase.nombre,
                    h.posicion,
                    h.totalInscriptos,
                    h.puntosNetos,
                  ])}
                />
              </div>
              <div className="space-y-4">
                {historial.map((h) => {
                  const isPodium = h.posicion <= 3;
                  return (
                    <Link key={h.campeonato.id} href={`/campeonatos/${h.campeonato.id}`} className="block">
                      <Card className="bg-surface border-border hover:border-primary/50 transition-colors group">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between p-4 sm:p-6">
                            
                            <div className="flex items-center gap-4 sm:gap-6">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isPodium ? 'bg-amber-500/10 text-amber-500' : 'bg-muted/15 text-muted-foreground'}`}>
                                {isPodium ? <MedalIcon className="w-6 h-6" /> : <span className="text-lg font-bold">#{h.posicion}</span>}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{h.campeonato.nombre}</h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                  <Badge variant="outline" className="font-normal">{h.campeonato.clase.nombre}</Badge>
                                  <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1"/> {h.campeonato.anio}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-2xl font-black">{h.posicion}<span className="text-sm text-muted-foreground font-normal ml-1">/ {h.totalInscriptos}</span></div>
                              <div className="text-xs text-muted-foreground mt-1">{h.puntosNetos} pts netos</div>
                            </div>

                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
