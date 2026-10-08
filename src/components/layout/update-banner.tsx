"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, XIcon } from "lucide-react";

const INTERVALO_CHEQUEO_MS = 5 * 60 * 1000;

// Sin service worker, el único momento en que el navegador vuelve a pedir
// el HTML/JS es una recarga real -en la PWA agregada a inicio, volver a
// abrirla normalmente RESUME la página que ya estaba en memoria en vez de
// recargarla, así que un deploy nuevo nunca llegaba sin cerrar la app del
// todo (deslizar hacia arriba) y reabrirla. Este banner chequea la versión
// desplegada (VERCEL_GIT_COMMIT_SHA, ver /api/version) cada vez que la
// pestaña vuelve a primer plano y cada 5 minutos mientras sigue abierta, y
// ofrece un botón para recargar en vez de forzar a cerrar y reabrir.
export function UpdateBanner({ version }: { version: string | null }) {
  const [versionNueva, setVersionNueva] = useState<string | null>(null);
  const chequeando = useRef(false);
  const descartada = useRef<string | null>(null);

  useEffect(() => {
    if (!version) return; // local: sin VERCEL_GIT_COMMIT_SHA, nada que comparar

    async function chequear() {
      if (chequeando.current) return;
      chequeando.current = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version: actual } = (await res.json()) as { version: string | null };
        if (actual && actual !== version && actual !== descartada.current) {
          setVersionNueva(actual);
        }
      } catch {
        // Sin red: no molestamos con el banner, se reintenta en el próximo chequeo.
      } finally {
        chequeando.current = false;
      }
    }

    chequear();
    const intervalo = setInterval(chequear, INTERVALO_CHEQUEO_MS);
    function alVolverVisible() {
      if (document.visibilityState === "visible") chequear();
    }
    document.addEventListener("visibilitychange", alVolverVisible);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolverVisible);
    };
  }, [version]);

  if (!versionNueva) return null;

  return (
    <div
      role="status"
      className="pointer-events-auto border-t border-border bg-surface/95 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)] fade-in-up"
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
        <RefreshCwIcon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <p className="text-sm text-foreground/90">Hay una versión nueva de Orzando.</p>
        <Button size="sm" onClick={() => window.location.reload()} className="rounded-full">
          Actualizar
        </Button>
        <button
          onClick={() => {
            descartada.current = versionNueva;
            setVersionNueva(null);
          }}
          aria-label="Cerrar aviso de actualización"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
