import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ConfiguracionForm } from "@/components/perfil/configuracion-form";

export const metadata: Metadata = {
  title: "Configuración de cuenta",
  robots: { index: false, follow: false },
};

// dynamic (no revalidate/caché): esta página muestra datos personales de
// la cuenta que acaba de tocar (apodo recién guardado, vinculación recién
// deshecha) -no tiene sentido servir una versión vieja cacheada.
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      apodo: true,
      notificarResultados: true,
      passwordHash: true,
      regatista: { select: { id: true, nombre: true, fotoUrl: true } },
    },
  });
  if (!user) redirect("/login");

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de cuenta</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>

        <ConfiguracionForm
          apodoInicial={user.apodo}
          notificarInicial={user.notificarResultados}
          email={user.email}
          regatista={user.regatista}
          tienePassword={!!user.passwordHash}
        />
      </div>
    </main>
  );
}
