import Link from "next/link";
import { HomeIcon, TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SailingBoat } from "@/components/icons/sailing-boat";

// Página 404 -Next.js la muestra automáticamente para cualquier ruta que
// no matchee nada (y también podemos forzarla a mano con notFound() desde
// una página dinámica, como ya hace /campeonatos/[id] y /regatistas/[id]
// para un id inexistente). Un velero "a la deriva" (mismo ícono de marca
// que el resto del sitio, ver SailingBoat) en vez de un mensaje de error
// genérico -la idea es la misma que ya usa el sitio (marca + humor sutil)
// pero apuntada al caso de "esta página no existe".
export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-background">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
          {/* Círculo de fondo, mismo estilo que el resto del sitio usa para
              destacar un ícono central (ver registro/login). */}
          <div className="absolute inset-0 rounded-full bg-primary/10" aria-hidden="true" />
          <span className="boat-adrift relative">
            <SailingBoat className="w-20 h-20 text-primary" />
          </span>
          <span
            className="float-question absolute -top-2 -right-1 text-3xl font-bold text-accent select-none"
            aria-hidden="true"
          >
            ?
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Rumbo perdido
          </h1>
          <p className="text-muted-foreground text-lg">
            No encontramos esta página -puede que el enlace esté roto, o que
            este resultado ya no exista.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/">
            <Button size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
              <HomeIcon className="w-5 h-5 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <Link href="/rankings">
            <Button variant="outline" size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
              <TrophyIcon className="w-5 h-5 mr-2" />
              Ver rankings
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};
