import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SettingsIcon, UserIcon } from "lucide-react";
import { getRegatistaProfile } from "@/lib/get-regatista-profile";
import { PerfilRegatista } from "@/components/regatista/perfil-regatista";

// Página privada (requiere sesión, ver redirect() más abajo): sin sentido
// indexarla, y menos con noindex no listado la evita en robots.txt igual
// -este metadata refuerza el X-Robots-Tag ya seteado en next.config.ts.
export const metadata: Metadata = {
  title: "Mi perfil",
  robots: { index: false, follow: false },
};

export default async function MiPerfilPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Refetch user to get the latest regatistaId if they just got linked
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isLinked = !!user?.regatistaId;
  const nombreMostrado = user?.apodo || session.user.name || session.user.email;

  // Misma función que usa el perfil público (/regatistas/[id]) -antes el
  // dashboard tenía su propia versión recortada (sin logros, sin el
  // historial completo) que se iba desincronizando de a poco.
  const data = isLinked ? await getRegatistaProfile(user.regatistaId as string) : null;

  if (!isLinked) {
    // Buscar si hay solicitud pendiente
    const solicitud = await prisma.solicitudVinculacion.findFirst({
      where: { userId: session.user.id, estado: 'PENDIENTE' }
    });
    if (solicitud) {
      return (
        <main className="min-h-dvh bg-background p-6 md:p-10 flex items-start justify-center">
          <Card className="w-full max-w-lg bg-surface border-border mt-10 text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Solicitud en proceso</CardTitle>
              <CardDescription className="text-base mt-2">
                Tu solicitud de vinculación está siendo revisada por un administrador. Por favor, tené paciencia.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      );
    }
  }

  if (!isLinked || !data) {
    return (
      <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-1">Mi Dashboard</h1>
                <p className="text-muted-foreground">{nombreMostrado}</p>
              </div>
            </div>
            <Link href="/mi-perfil/configuracion">
              <Button variant="outline" size="sm" className="gap-2">
                <SettingsIcon className="w-4 h-4" /> Configuración
              </Button>
            </Link>
          </header>

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
        </div>
      </main>
    );
  }

  // Mismo componente que el perfil público (/regatistas/[id]) -ver
  // PerfilRegatista: solo se le agrega la insignia de "vinculado" y el
  // acceso a Configuración en el header, el resto (logros incluidos) es
  // idéntico a lo que ve cualquier visitante.
  return (
    <main className="min-h-dvh bg-background text-foreground pb-20">
      <PerfilRegatista
        {...data}
        headerActions={
          <>
            <Badge variant="default" className="bg-primary-solid text-white">Perfil Vinculado</Badge>
            <Link href="/mi-perfil/configuracion">
              <Button variant="outline" size="sm" className="gap-2">
                <SettingsIcon className="w-4 h-4" /> Configuración
              </Button>
            </Link>
          </>
        }
      />
    </main>
  );
}
