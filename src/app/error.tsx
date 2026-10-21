'use client';

import Link from "next/link";
import { HomeIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SailingBoat } from "@/components/icons/sailing-boat";

// Pantalla de error inesperado (una consulta que falló, la base que no
// responde, etc.): Next la muestra en lugar de su cartel genérico en inglés
// ("This page couldn't load"). Mismo lenguaje visual que la 404 (not-found.tsx)
// y un botón para reintentar sin recargar toda la página.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-background">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/10" aria-hidden="true" />
          <SailingBoat className="relative w-20 h-20 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground text-lg">
            No pudimos cargar esta página. Suele ser algo pasajero: probá de
            nuevo en unos segundos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button size="lg" onClick={reset} className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
            <RotateCcwIcon className="w-5 h-5 mr-2" />
            Reintentar
          </Button>
          <Link href="/">
            <Button variant="outline" size="lg" className="rounded-full font-semibold px-8 h-12 w-full sm:w-auto">
              <HomeIcon className="w-5 h-5 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
