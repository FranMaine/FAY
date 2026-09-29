"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XIcon, InfoIcon } from "lucide-react";

const CLAVE_STORAGE = "fay-beta-aviso-visto";

// Aviso de que el sitio está en sus primeras etapas -a pedido explícito,
// pese a que va contra el criterio de minimizar avisos en la primera
// visita de un sitio público (ver conversación): el objetivo acá es que
// alguien que se vea mal cargado (nombre duplicado, dato incorrecto) sepa
// que puede avisar, en vez de asumir que el sitio no sirve. Arriba de
// todo (no abajo, donde ya está el aviso de cookies) y descartable, para
// no acumular dos avisos fijos en pantalla al mismo tiempo.
function yaVioElAviso(): boolean {
  try {
    return !!localStorage.getItem(CLAVE_STORAGE);
  } catch {
    return true; // sin storage disponible, mejor no insistir con el aviso
  }
}

export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  // Mismo patrón que CookieBanner: el valor real de localStorage solo se
  // conoce en el cliente, así que arrancamos en `false` y lo corregimos
  // acá dentro de un requestAnimationFrame (evita el warning de
  // "cascading renders" de react-hooks/set-state-in-effect).
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
      // Sin storage disponible, el aviso vuelve a aparecer en la próxima
      // visita -degradación aceptable, no rompe nada.
    }
  }

  if (!visible) return null;

  return (
    <div role="region" aria-label="Aviso" className="bg-amber-500/15 border-b border-amber-500/30">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <InfoIcon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-foreground/90 flex-1">
          Orzando está en sus primeras etapas. Si ves un error o tu nombre
          está duplicado,{" "}
          <Link href="/contacto" className="text-primary hover:underline font-medium">
            contactanos
          </Link>
          .
        </p>
        <button
          onClick={cerrar}
          aria-label="Cerrar aviso"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
