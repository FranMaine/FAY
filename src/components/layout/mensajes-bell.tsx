"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MailIcon } from "lucide-react";

const POLL_MS = 120_000;

// Sobrecito con globito para quien tiene respuestas sin ver a sus mensajes de
// /contacto. Si no hay ninguna, no se muestra (no ocupa lugar en la barra).
export function MensajesBell() {
  const [sinLeer, setSinLeer] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await fetch("/api/mis-mensajes?resumen=1");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelado) setSinLeer(Number(data.sinLeer) || 0);
      } catch {
        // sin red: sin globito, sin romper la barra
      }
    }
    cargar();
    const intervalo = setInterval(cargar, POLL_MS);
    window.addEventListener("mensajes-leidos", cargar);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      window.removeEventListener("mensajes-leidos", cargar);
    };
  }, []);

  if (!sinLeer) return null;
  return (
    <Link
      href="/mi-perfil/mensajes"
      aria-label={`${sinLeer} respuesta${sinLeer === 1 ? "" : "s"} nueva${sinLeer === 1 ? "" : "s"} a tus mensajes`}
      className="relative inline-flex items-center justify-center rounded-md p-2 h-9 w-9 text-muted hover:bg-surface-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
    >
      <MailIcon className="h-5 w-5" />
      <span aria-hidden="true" className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
        {sinLeer > 9 ? "9+" : sinLeer}
      </span>
    </Link>
  );
}
