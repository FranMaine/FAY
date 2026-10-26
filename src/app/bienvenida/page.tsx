import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OpcionesUso } from "@/components/bienvenida/opciones-uso";

// Pantalla de un solo uso, privada: sin sentido indexarla.
export const metadata: Metadata = {
  title: "Bienvenida",
  robots: { index: false, follow: false },
};

export default async function BienvenidaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const usuario = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { perfilUso: true, name: true },
  });

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-8 pt-4 md:pt-10">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            ¡Bienvenido{usuario?.name ? `, ${usuario.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Contanos cómo vas a usar Orzando y te llevamos directo a lo que más te sirve.
          </p>
        </header>
        <OpcionesUso elegido={usuario?.perfilUso ?? null} />
      </div>
    </main>
  );
}
