"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon, MailIcon, UserCheckIcon } from "lucide-react";
import { intervaloVisible } from "@/lib/intervalo-visible";

const POLL_MS = 60_000;

// Campanita de notificaciones para el admin: junta lo que hay para atender
// ahora mismo, sin tener que entrar a mirar cada pantalla:
//  - solicitudes de vinculación PENDIENTES (usuario pidiendo "esta ficha de
//    regatista es la mía"; mismo endpoint que /admin/solicitudes, así que la
//    cantidad es el largo de esa lista) y
//  - conversaciones de /contacto con novedades (mensaje nuevo o respuesta de
//    la persona que el admin todavía no leyó).
// Si hay de una sola clase, un clic va directo; si hay de las dos, abre un
// menú chiquito para elegir.
export function NotificationBell() {
  const [solicitudes, setSolicitudes] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch("/api/admin/solicitudes");
        if (res.ok) {
          const data = await res.json();
          if (!cancelado) setSolicitudes(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // Sin red o el fetch falla: mejor no mostrar badge que mostrar uno
        // desactualizado o romper el render de la navbar por esto.
      }
      try {
        const res = await fetch("/api/admin/mensajes?resumen=1");
        if (res.ok) {
          const data = await res.json();
          if (!cancelado) setMensajes(Number(data.sinLeer) || 0);
        }
      } catch {
        // idem
      }
    }

    cargar();
    // Refresca sola cada un minuto -así un admin que deja la pestaña
    // abierta ve aparecer una solicitud o un mensaje nuevo sin recargar.
    const detener = intervaloVisible(cargar, POLL_MS);
    return () => {
      cancelado = true;
      detener();
    };
  }, []);

  // El menú se cierra al tocar afuera.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const nSol = solicitudes ?? 0;
  const nMsj = mensajes ?? 0;
  const total = nSol + nMsj;

  const etiqueta =
    total === 0
      ? "Notificaciones"
      : [
          nSol ? `${nSol} solicitud${nSol === 1 ? "" : "es"} de vinculación pendiente${nSol === 1 ? "" : "s"}` : "",
          nMsj ? `${nMsj} mensaje${nMsj === 1 ? "" : "s"} con novedades` : "",
        ]
          .filter(Boolean)
          .join(" y ");

  const clases =
    "relative inline-flex items-center justify-center rounded-md p-2 h-9 w-9 text-muted hover:bg-surface-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors";
  const globito = total > 0 && (
    <span
      aria-hidden="true"
      className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white"
    >
      {total > 9 ? "9+" : total}
    </span>
  );

  // De una sola clase (o ninguna): link directo, como antes.
  if (nSol === 0 || nMsj === 0) {
    const destino = nMsj > 0 ? "/admin/mensajes" : "/admin/solicitudes";
    return (
      <Link href={destino} aria-label={etiqueta} className={clases}>
        <BellIcon className="h-5 w-5" />
        {globito}
      </Link>
    );
  }

  return (
    <div ref={caja} className="relative">
      <button type="button" aria-label={etiqueta} aria-expanded={abierto} onClick={() => setAbierto((v) => !v)} className={clases}>
        <BellIcon className="h-5 w-5" />
        {globito}
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-surface p-1 shadow-xl">
          <Link href="/admin/solicitudes" role="menuitem" onClick={() => setAbierto(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-hover">
            <UserCheckIcon className="h-4 w-4 text-muted" />
            <span className="flex-1">Solicitudes de vinculación</span>
            <span className="rounded-full bg-error px-1.5 text-[11px] font-bold text-white">{nSol}</span>
          </Link>
          <Link href="/admin/mensajes" role="menuitem" onClick={() => setAbierto(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-hover">
            <MailIcon className="h-4 w-4 text-muted" />
            <span className="flex-1">Mensajes</span>
            <span className="rounded-full bg-error px-1.5 text-[11px] font-bold text-white">{nMsj}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
