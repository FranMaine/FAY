import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { FavoritosPantalla } from "@/components/favoritos/favoritos-pantalla";

// Página privada (depende de la cuenta): sin sentido indexarla.
export const metadata: Metadata = {
  title: "Mis favoritos",
  robots: { index: false, follow: false },
};

export default async function FavoritosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Mis favoritos</h1>
          <p className="max-w-2xl text-muted-foreground">
            Tené a mano a tus hijos, a tu equipo o a quien quieras seguir: aparecen en el inicio apenas entrás y te
            avisamos por mail cuando se publica un campeonato en el que figuran.
          </p>
        </header>

        <FavoritosPantalla />
      </div>
    </main>
  );
}
