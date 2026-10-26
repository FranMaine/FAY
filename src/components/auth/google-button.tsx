"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Logo oficial de Google (multicolor): no existe en la librería de íconos
// del proyecto, y las pautas de marca de Google piden usarlo tal cual.
function LogoGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// "Continuar con Google" para login y registro. Solo se muestra si el
// servidor tiene configurado el provider (/api/auth/providers lo lista
// únicamente con AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET cargadas): así el
// botón nunca lleva a un error en un entorno sin credenciales. Si el aviso
// de términos se pide (registro), la persona acepta al continuar.
export function GoogleButton({ conAvisoLegal = false }: { conAvisoLegal?: boolean }) {
  const [disponible, setDisponible] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getProviders()
      .then((providers) => {
        if (!cancelado) setDisponible(!!providers?.google);
      })
      .catch(() => {
        // Sin red o sin respuesta: no se ofrece, el formulario sigue andando.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (!disponible) return null;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2.5 bg-background"
        disabled={cargando}
        onClick={() => {
          setCargando(true);
          // Si algo falla antes de salir hacia Google, se vuelve a habilitar.
          signIn("google", { callbackUrl: "/mi-perfil" }).catch(() => setCargando(false));
        }}
      >
        <LogoGoogle className="h-4 w-4" />
        {cargando ? "Conectando con Google…" : "Continuar con Google"}
      </Button>
      {conAvisoLegal && (
        <p className="text-center text-xs text-muted-foreground">
          Al continuar con Google aceptás el{" "}
          <Link href="/aviso-legal" target="_blank" className="text-primary hover:underline">
            Aviso Legal
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="text-primary hover:underline">
            Política de Privacidad
          </Link>
          .
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        <span>o con tu email</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
