import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PosicionHistorica } from "@/components/charts/posicion-historica";
import { ResultadosTable } from "@/components/tables/resultados-table";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MiPerfilPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isLinked = !!session?.user?.regatistaId; 
  const userName = session?.user?.name || "Regatista";

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Mi Perfil</h1>
            <p className="text-muted-foreground">{userName}</p>
          </div>
          {isLinked && (
            <Badge variant="default" className="bg-primary text-primary-foreground">Perfil Vinculado</Badge>
          )}
        </header>

        {!isLinked ? (
          <Card className="bg-surface border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Vinculá tu cuenta</CardTitle>
              <CardDescription>
                Conectá tu cuenta de FAY Stats a tu perfil de regatista para ver tus estadísticas y resultados históricos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Link href="/vincular">
                <Button size="lg">Vincular ahora</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Campeonatos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">12</div>
                </CardContent>
              </Card>
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Mejor Puesto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">3°</div>
                </CardContent>
              </Card>
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">8.5</div>
                </CardContent>
              </Card>
              <Card className="bg-surface border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Clase</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Optimist</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-surface border-border">
                <CardHeader>
                  <CardTitle>Evolución de Posiciones</CardTitle>
                  <CardDescription>Tu posición general en los últimos campeonatos</CardDescription>
                </CardHeader>
                <CardContent>
                  <PosicionHistorica data={[
                    { campeonato: "Copa 1", posicion: 15, anio: 2020 },
                    { campeonato: "Copa 2", posicion: 8, anio: 2021 },
                    { campeonato: "Copa 3", posicion: 12, anio: 2022 },
                    { campeonato: "Copa 4", posicion: 5, anio: 2023 },
                    { campeonato: "Copa 5", posicion: 3, anio: 2024 },
                  ]} />
                </CardContent>
              </Card>

              <Card className="bg-surface border-border">
                <CardHeader>
                  <CardTitle>Resultados Recientes</CardTitle>
                  <CardDescription>Tus últimos desempeños</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                   <ResultadosTable clasificacion={[
                     { id: "1", posicion: 3, nombre: userName, club: "YCA", totalNeto: 25, puntajes: [] },
                     { id: "2", posicion: 5, nombre: userName, club: "YCA", totalNeto: 42, puntajes: [] },
                     { id: "3", posicion: 12, nombre: userName, club: "YCA", totalNeto: 60, puntajes: [] },
                   ]} regatas={[]} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
