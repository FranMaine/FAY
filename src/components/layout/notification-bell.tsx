"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "lucide-react";

const POLL_MS = 60_000;

// Campanita de notificaciones para el admin: cuántas solicitudes de
// vinculación (usuario pidiendo "esta ficha de regatista es la mía") están
// PENDIENTES ahora mismo, sin tener que entrar a /admin/solicitudes a
// mirar. Reusa el mismo endpoint que ya filtra por PENDIENTE
// (/api/admin/solicitudes, ver src/app/api/admin/solicitudes/route.ts),
// así que la cantidad es simplemente el largo de esa lista -no hace falta
// un endpoint aparte solo para el conteo.
export function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch("/api/admin/solicitudes");
        if (!res.ok) return; // no admin, sesión vencida, etc. -sin badge, sin romper la navbar
        const data = await res.json();
        if (!cancelado) setCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // Sin red o el fetch falla: mejor no mostrar badge que mostrar uno
        // desactualizado o romper el render de la navbar por esto.
      }
    }

    cargar();
    // Refresca sola cada un minuto -así un admin que deja la pestaña
    // abierta ve aparecer una solicitud nueva sin tener que recargar.
    const interval = setInterval(cargar, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, []);

  const hayPendientes = !!count;

  return (
    <Link
      href="/admin/solicitudes"
      aria-label={
        hayPendientes
          ? `${count} solicitud${count === 1 ? '' : 'es'} de vinculación pendiente${count === 1 ? '' : 's'}`
          : 'Solicitudes de vinculación'
      }
      className="relative inline-flex items-center justify-center rounded-md p-2 h-9 w-9 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
    >
      <BellIcon className="h-5 w-5" />
      {hayPendientes && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white"
        >
          {count! > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
