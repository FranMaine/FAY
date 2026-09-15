"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

const CLAVE_STORAGE = "fay-cookies-aviso-visto";

// Aviso de cookies: como las únicas cookies del sitio son estrictamente
// necesarias para el login (ver /cookies), esto es un AVISO informativo
// -no un selector de "aceptar/rechazar" categorías, que no aplicaría acá
// porque no hay ninguna cookie opcional para rechazar. Se guarda en
// localStorage (no en una cookie: mostrar el aviso de cookies usando una
// cookie sería un poco absurdo) que ya se mostró, para no repetirlo en
// cada visita.
function yaVioElAviso(): boolean {
  try {
    return !!localStorage.getItem(CLAVE_STORAGE);
  } catch {
    return true; // sin storage disponible, mejor no insistir con el aviso
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  // Mismo patrón que ThemeToggle: el valor real de localStorage solo se
  // conoce en el cliente, así que arrancamos en `false` (igual que el
  // render del servidor, sin mismatch de hidratación) y lo corregimos acá
  // -el setState dentro de un requestAnimationFrame (no síncrono dentro
  // del cuerpo del efecto) es lo que evita el warning de "cascading
  // renders" de la regla react-hooks/set-state-in-effect.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(!yaVioElAviso());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_STORAGE, "1");
    } catch {
      // Sin storage disponible, el aviso volverá a aparecer en la próxima
      // visita -aceptable como degradación, no rompe nada.
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-sm text-foreground/90 flex-1 text-center sm:text-left">
          Usamos únicamente cookies necesarias para que funcione el inicio de
          sesión. No usamos cookies de analítica ni de publicidad.{" "}
          <Link href="/cookies" className="text-primary hover:underline font-medium">
            Más información
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={cerrar} className="rounded-full">
            Entendido
          </Button>
          <button
            onClick={cerrar}
            aria-label="Cerrar aviso de cookies"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
