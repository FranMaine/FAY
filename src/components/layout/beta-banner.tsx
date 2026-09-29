"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const CLAVE_STORAGE = "fay-beta-aviso-visto";

// Aviso de que el sitio está en sus primeras etapas -a pedido explícito,
// pese a que va contra el criterio de minimizar avisos en la primera
// visita de un sitio público: el objetivo acá es que alguien que se vea
// mal cargado (nombre duplicado, dato incorrecto) sepa que puede avisar,
// en vez de asumir que el sitio no sirve. Modal centrado (no una franja)
// para que se note más -aparece una sola vez por visitante, se guarda en
// localStorage igual que el aviso de cookies.
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

  return (
    <Modal isOpen={visible} onClose={cerrar} className="w-full max-w-sm">
      <div className="p-6 space-y-4 text-center">
        <span className="icon-pop-in mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <InfoIcon className="h-6 w-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="fade-in-up text-lg font-bold text-foreground" style={{ animationDelay: "80ms" }}>
            Orzando está en sus primeras etapas
          </h2>
          <p className="fade-in-up text-sm text-muted-foreground" style={{ animationDelay: "140ms" }}>
            Si ves un error o tu nombre está duplicado, avisanos desde la{" "}
            <Link href="/contacto" onClick={cerrar} className="text-primary hover:underline font-medium">
              página de contacto
            </Link>
            .
          </p>
        </div>
        <Button onClick={cerrar} className="fade-in-up w-full rounded-full" style={{ animationDelay: "200ms" }}>
          Entendido
        </Button>
      </div>
    </Modal>
  );
}
