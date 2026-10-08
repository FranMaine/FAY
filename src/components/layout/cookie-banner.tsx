"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { leerConsentimiento, guardarConsentimiento } from "@/lib/consentimiento";

// Orzando está sumando analítica y publicidad (Google): mientras el
// visitante no elija, esas categorías quedan apagadas -solo las cookies
// necesarias para el login funcionan sin pedir nada, porque están exentas
// de consentimiento por ser imprescindibles para el servicio pedido.
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [personalizando, setPersonalizando] = useState(false);
  const [analitica, setAnalitica] = useState(false);
  const [publicidad, setPublicidad] = useState(false);

  // Mismo patrón que ThemeToggle: el valor real de localStorage solo se
  // conoce en el cliente, así que arrancamos en `false` (igual que el
  // render del servidor, sin mismatch de hidratación) y lo corregimos acá
  // -el setState dentro de un requestAnimationFrame (no síncrono dentro
  // del cuerpo del efecto) es lo que evita el warning de "cascading
  // renders" de la regla react-hooks/set-state-in-effect.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(leerConsentimiento() === null);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function elegir(eleccion: { analitica: boolean; publicidad: boolean }) {
    guardarConsentimiento(eleccion);
    setVisible(false);
    setPersonalizando(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="pointer-events-auto border-t border-border bg-surface/95 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)] fade-in-up"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <p className="text-sm text-foreground/90 flex-1 text-center sm:text-left">
            Usamos cookies necesarias para el login, y -si lo aceptás- de
            analítica y publicidad para mantener el sitio gratis.{" "}
            <Link href="/cookies" className="text-primary hover:underline font-medium">
              Más información
            </Link>
          </p>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            <button
              onClick={() => setPersonalizando((v) => !v)}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 px-1"
            >
              Personalizar
            </button>
            <Button size="sm" variant="outline" onClick={() => elegir({ analitica: false, publicidad: false })} className="rounded-full">
              Rechazar opcionales
            </Button>
            <Button size="sm" onClick={() => elegir({ analitica: true, publicidad: true })} className="rounded-full">
              Aceptar todo
            </Button>
            <button
              onClick={() => elegir({ analitica: false, publicidad: false })}
              aria-label="Cerrar aviso de cookies (equivale a rechazar las opcionales)"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {personalizando && (
          <div className="max-w-md mx-auto sm:mx-0 space-y-3 rounded-xl border border-border bg-background/60 p-4 fade-in-up">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked disabled className="mt-0.5 accent-primary" />
              <span>
                <span className="font-medium text-foreground">Necesarias</span>
                <span className="block text-muted-foreground">Login y seguridad. Siempre activas.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={analitica}
                onChange={(e) => setAnalitica(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="font-medium text-foreground">Analítica</span>
                <span className="block text-muted-foreground">Nos ayuda a entender qué páginas se usan más.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={publicidad}
                onChange={(e) => setPublicidad(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="font-medium text-foreground">Publicidad</span>
                <span className="block text-muted-foreground">Anuncios que mantienen el sitio gratuito.</span>
              </span>
            </label>
            <Button size="sm" onClick={() => elegir({ analitica, publicidad })} className="rounded-full w-full">
              Guardar preferencias
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
