"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Loader2Icon, SaveIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { mensajeDeError } from "@/lib/utils";

interface ConfiguracionFormProps {
  apodoInicial: string | null;
  email: string;
  regatista: { id: string; nombre: string } | null;
}

export function ConfiguracionForm({ apodoInicial, email, regatista }: ConfiguracionFormProps) {
  const router = useRouter();

  const [apodo, setApodo] = useState(apodoInicial || "");
  const [guardandoApodo, setGuardandoApodo] = useState(false);
  const [apodoGuardado, setApodoGuardado] = useState(false);
  const [errorApodo, setErrorApodo] = useState<string | null>(null);

  const [desvinculando, setDesvinculando] = useState(false);
  const [errorDesvincular, setErrorDesvincular] = useState<string | null>(null);

  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function guardarApodo(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoApodo(true);
    setErrorApodo(null);
    setApodoGuardado(false);
    try {
      const res = await fetch("/api/mi-perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apodo: apodo.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el apodo");
      setApodoGuardado(true);
    } catch (err) {
      setErrorApodo(mensajeDeError(err));
    } finally {
      setGuardandoApodo(false);
    }
  }

  async function desvincular() {
    setDesvinculando(true);
    setErrorDesvincular(null);
    try {
      const res = await fetch("/api/vincular", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo desvincular");
      router.refresh();
    } catch (err) {
      setErrorDesvincular(mensajeDeError(err));
    } finally {
      setDesvinculando(false);
    }
  }

  async function eliminarCuenta() {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      const res = await fetch("/api/mi-perfil", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar la cuenta");
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setErrorEliminar(mensajeDeError(err));
      setEliminando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Apodo</CardTitle>
          <CardDescription>
            Solo para vos -no aparece en resultados ni tablas de posiciones, esas siguen mostrando tu nombre oficial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarApodo} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={apodo}
              onChange={(e) => {
                setApodo(e.target.value);
                setApodoGuardado(false);
              }}
              placeholder={email}
              maxLength={40}
              className="bg-background border-border flex-1"
            />
            <Button type="submit" disabled={guardandoApodo} className="gap-2 shrink-0">
              {guardandoApodo ? <Loader2Icon className="w-4 h-4 animate-spin" /> : apodoGuardado ? <CheckCircle2Icon className="w-4 h-4" /> : <SaveIcon className="w-4 h-4" />}
              {apodoGuardado ? "Guardado" : "Guardar"}
            </Button>
          </form>
          {errorApodo && <p className="text-sm text-red-500 mt-2">{errorApodo}</p>}
        </CardContent>
      </Card>

      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Vinculación con tu perfil de regatista</CardTitle>
          <CardDescription>
            {regatista
              ? "Tu cuenta está vinculada al historial de resultados de este regatista."
              : "Tu cuenta todavía no está vinculada a ningún perfil de regatista."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          {regatista ? (
            <>
              <Link href={`/regatistas/${regatista.id}`} className="font-medium text-primary hover:underline">
                {regatista.nombre}
              </Link>
              <ConfirmDeleteButton
                label="Desvincular"
                confirmLabel="¿Desvincular?"
                disabled={desvinculando}
                onConfirm={desvincular}
                mostrarTexto
              />
            </>
          ) : (
            <Link href="/vincular">
              <Button variant="outline" size="sm">Buscar mi perfil</Button>
            </Link>
          )}
        </CardContent>
        {errorDesvincular && <p className="text-sm text-red-500 px-6 pb-4">{errorDesvincular}</p>}
      </Card>

      <Card className="bg-surface border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-500">Eliminar cuenta</CardTitle>
          <CardDescription>
            Borra tu cuenta y todo lo asociado a ella (sesiones, solicitudes de vinculación). Tu historial de
            resultados como regatista NO se borra -solo se desvincula de esta cuenta. No se puede deshacer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDeleteButton
            label="Eliminar mi cuenta"
            confirmLabel="¿Eliminar todo?"
            disabled={eliminando}
            onConfirm={eliminarCuenta}
            mostrarTexto
          />
          {errorEliminar && <p className="text-sm text-red-500 mt-2">{errorEliminar}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
