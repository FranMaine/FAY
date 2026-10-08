import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, TrophyIcon, MapPinIcon, CalendarIcon, MedalIcon, UserIcon } from "lucide-react";
import { ExcelDownloadButton } from "@/components/ui/excel-download-button";
import { PosicionHistorica } from "@/components/charts/posicion-historica";
import { LOGROS } from "@/lib/logros";
import { LogrosSection } from "@/components/ui/logros-section";
import type { RegatistaProfileData } from "@/lib/get-regatista-profile";

// El cuerpo del perfil de un regatista -header, logros, gráfico, historial
// completo- vive acá para que el perfil público (/regatistas/[id]) y el
// dashboard propio (/mi-perfil) muestren exactamente lo mismo (antes el
// dashboard tenía su propia versión recortada, sin logros, que se iba a
// desincronizar de la pública cada vez que se agregara algo acá).
type Props = RegatistaProfileData & {
  /** El perfil público muestra "Volver al inicio"; el dashboard no lo necesita. */
  volverHref?: string;
  /** El dashboard propio agrega acá la insignia de "Perfil Vinculado" y el botón de Configuración. */
  headerActions?: React.ReactNode;
};

export function PerfilRegatista({ regatista, historial, chartData, logros, volverHref, headerActions }: Props) {
  return (
    <>
      <div className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {volverHref && (
            <Link href={volverHref}>
              <Button variant="ghost" size="sm" className="mb-6 -ml-3 text-muted-foreground">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          )}

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
                      {[regatista.club.nombre, ...regatista.otrosClubes.map((c) => c.nombre)].join(" + ")}
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
            {headerActions && <div className="flex items-center gap-3">{headerActions}</div>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {historial.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { etiqueta: "Campeonatos", valor: `${historial.length}` },
              { etiqueta: "Podios", valor: `${historial.filter((h) => h.posicion <= 3).length}` },
              { etiqueta: "Mejor puesto", valor: `${Math.min(...historial.map((h) => h.posicion))}°` },
            ].map((e) => (
              <div key={e.etiqueta} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-2xl sm:text-4xl font-extrabold tracking-tight tabular-nums">{e.valor}</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{e.etiqueta}</p>
              </div>
            ))}
          </div>
        )}
        {logros.length > 0 && (
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-xl">Logros</CardTitle>
              <CardDescription>
                {logros.length} de {LOGROS.length} desbloqueados — tocá una medalla para ver el detalle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogrosSection logros={logros} />
            </CardContent>
          </Card>
        )}
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
                <ExcelDownloadButton
                  filename={`${regatista.nombre} - historial.xlsx`}
                  sheetName="Historial"
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
    </>
  );
}
