"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Loader2Icon, SaveIcon, CheckCircle2Icon, UploadIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { mensajeDeError } from "@/lib/utils";

interface ConfiguracionFormProps {
  apodoInicial: string | null;
  email: string;
  regatista: { id: string; nombre: string; fotoUrl: string | null } | null;
  tienePassword: boolean;
}

export function ConfiguracionForm({ apodoInicial, email, regatista, tienePassword }: ConfiguracionFormProps) {
  const router = useRouter();

  const [apodo, setApodo] = useState(apodoInicial || "");
  const [guardandoApodo, setGuardandoApodo] = useState(false);
  const [apodoGuardado, setApodoGuardado] = useState(false);
  const [errorApodo, setErrorApodo] = useState<string | null>(null);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [passwordGuardada, setPasswordGuardada] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  const [fotoUrl, setFotoUrl] = useState(regatista?.fotoUrl || null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

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

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoPassword(true);
    setErrorPassword(null);
    setPasswordGuardada(false);
    try {
      const res = await fetch("/api/mi-perfil/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar la contraseña");
      setPasswordGuardada(true);
      setPasswordActual("");
      setPasswordNueva("");
      setConfirmPassword("");
    } catch (err) {
      setErrorPassword(mensajeDeError(err));
    } finally {
      setGuardandoPassword(false);
    }
  }

  async function subirFoto(file: File) {
    setSubiendoFoto(true);
    setErrorFoto(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/mi-perfil/foto", { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la foto");
      setFotoUrl(data.fotoUrl);
    } catch (err) {
      setErrorFoto(mensajeDeError(err));
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function quitarFoto() {
    setErrorFoto(null);
    try {
      const res = await fetch("/api/mi-perfil/foto", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo quitar la foto");
      setFotoUrl(null);
    } catch (err) {
      setErrorFoto(mensajeDeError(err));
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

      {regatista && (
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle>Foto de perfil</CardTitle>
            <CardDescription>Se muestra en tu ficha pública de regatista, en vez de las iniciales genéricas.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {fotoUrl ? (
              <Image src={fotoUrl} alt={regatista.nombre} width={64} height={64} className="w-16 h-16 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserIcon className="w-8 h-8" />
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subirFoto(file);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={subiendoFoto} onClick={() => fotoInputRef.current?.click()} className="gap-2">
                  {subiendoFoto ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                  {fotoUrl ? "Cambiar" : "Subir foto"}
                </Button>
                {fotoUrl && <ConfirmDeleteButton onConfirm={quitarFoto} label="Quitar foto" />}
              </div>
              {errorFoto && <p className="text-sm text-red-500">{errorFoto}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tienePassword && (
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>Cambiá la contraseña con la que iniciás sesión.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={cambiarPassword} className="space-y-3">
              <Input
                type="password"
                value={passwordActual}
                onChange={(e) => { setPasswordActual(e.target.value); setPasswordGuardada(false); }}
                placeholder="Contraseña actual"
                className="bg-background border-border"
                autoComplete="current-password"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="password"
                  value={passwordNueva}
                  onChange={(e) => { setPasswordNueva(e.target.value); setPasswordGuardada(false); }}
                  placeholder="Contraseña nueva"
                  className="bg-background border-border flex-1"
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordGuardada(false); }}
                  placeholder="Confirmar contraseña nueva"
                  className="bg-background border-border flex-1"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={guardandoPassword} className="gap-2">
                {guardandoPassword ? <Loader2Icon className="w-4 h-4 animate-spin" /> : passwordGuardada ? <CheckCircle2Icon className="w-4 h-4" /> : <SaveIcon className="w-4 h-4" />}
                {passwordGuardada ? "Guardada" : "Cambiar contraseña"}
              </Button>
            </form>
            {errorPassword && <p className="text-sm text-red-500 mt-2">{errorPassword}</p>}
          </CardContent>
        </Card>
      )}

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
