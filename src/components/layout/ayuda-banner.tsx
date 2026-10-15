"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon, XIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CLAVE_STORAGE = "fay-ayuda-banner-visto";

function yaLoCerro(): boolean {
  try {
    return !!localStorage.getItem(CLAVE_STORAGE);
  } catch {
    return true; // sin storage, mejor no insistir en cada página
  }
}

// Franja debajo de la barra de navegación que invita a mirar el tutorial.
// Se queda hasta que la persona la cierra (o entra al tutorial) y después no
// vuelve: la decisión se guarda en localStorage. Va debajo del navbar y no
// arriba de todo porque en la app instalada el navbar es el que reserva el
// espacio del notch/Dynamic Island. Mismo patrón que BetaBanner: el valor de
// localStorage solo se conoce en el cliente, así que arranca oculta y se
// decide dentro de un requestAnimationFrame.
export function AyudaBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(!yaLoCerro()));
    return () => cancelAnimationFrame(raf);
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_STORAGE, "1");
    } catch {
      // Sin storage vuelve a aparecer en la próxima visita: aceptable.
    }
  }

  // En el tutorial mismo no tiene sentido invitar a ir al tutorial (no se
  // marca como visto: si cierra la pestaña sin tocarlo, sigue pendiente).
  if (!visible || pathname === "/ayuda") return null;

  return (
    <div role="region" aria-label="Tutorial de Orzando" className="relative z-10 border-b border-border bg-primary/10 fade-in-up">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
        <BookOpenIcon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 text-sm text-foreground/90">
          ¿Primera vez en Orzando? Mirá cómo sacarle el jugo.
        </p>
        <Link
          href="/ayuda"
          onClick={cerrar}
          className={cn(buttonVariants({ size: "sm" }), "rounded-full shrink-0")}
        >
          Ver tutorial
        </Link>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar aviso del tutorial"
          className="shrink-0 p-1.5 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
