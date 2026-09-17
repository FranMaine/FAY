"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { SailingBoat } from "@/components/icons/sailing-boat";
import { mensajeDeError } from "@/lib/utils";

type Estado = "verificando" | "ok" | "error";

function VerificarEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const faltaElLink = !token || !email;
  // Estado inicial calculado con un inicializador perezoso (no en un
  // efecto): si falta el link, ya arranca en "error" desde el primer
  // render -evita el problema de "setState síncrono dentro de un efecto"
  // (mismo tema documentado en CookieBanner/ThemeToggle) para un caso que
  // de todas formas no depende de nada asincrónico.
  const [estado, setEstado] = useState<Estado>(faltaElLink ? "error" : "verificando");
  const [error, setError] = useState<string | null>(faltaElLink ? "Falta el enlace de verificación." : null);

  useEffect(() => {
    if (faltaElLink) return;

    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verificar-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });
        const data = await res.json();
        if (cancelado) return;
        if (!res.ok) throw new Error(data.error || "No se pudo verificar el email");
        setEstado("ok");
      } catch (err) {
        if (!cancelado) {
          setEstado("error");
          setError(mensajeDeError(err));
        }
      }
    })();

    return () => {
      cancelado = true;
    };
    // Solo una vez, al montar -no hay nada en el medio que deba disparar
    // otro intento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface border-border">
        <CardHeader className="space-y-2 items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <SailingBoat className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Confirmar email</CardTitle>
          {estado === "verificando" && <CardDescription>Un momento, estamos confirmando tu cuenta...</CardDescription>}
        </CardHeader>
        <CardContent>
          {estado === "verificando" && (
            <div className="flex justify-center py-4">
              <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {estado === "ok" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2Icon className="w-10 h-10 text-success mx-auto" />
              <p className="text-sm text-muted-foreground">Tu email quedó confirmado. Ya podés usar tu cuenta con normalidad.</p>
            </div>
          )}
          {estado === "error" && (
            <div className="text-center space-y-3 py-4">
              <XCircleIcon className="w-10 h-10 text-error mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/">
            <Button variant="ghost" size="sm">Volver al inicio</Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense>
      <VerificarEmailContent />
    </Suspense>
  );
}
