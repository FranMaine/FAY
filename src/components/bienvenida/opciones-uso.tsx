"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPCIONES_USO, type PerfilUso } from "@/lib/perfil-uso";
import { mensajeDeError } from "@/lib/utils";

// Las tres opciones de "cómo usás Orzando". Al elegir una se guarda y se
// lleva a la persona a lo que le corresponde (ver OPCIONES_USO).
export function OpcionesUso({ elegido }: { elegido: PerfilUso | null }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<PerfilUso | "omitir" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function continuar(perfilUso: PerfilUso | null) {
    setGuardando(perfilUso ?? "omitir");
    setError(null);
    try {
      const res = await fetch("/api/mi-perfil/bienvenida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfilUso ? { perfilUso } : {}),
      });
      if (!res.ok) throw new Error((await res.json()).error || "No se pudo guardar tu elección");
      router.push(perfilUso ? OPCIONES_USO[perfilUso].destino : "/mi-perfil");
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err));
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-500">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(OPCIONES_USO) as PerfilUso[]).map((clave) => {
          const op = OPCIONES_USO[clave];
          const Icono = op.icono;
          return (
            <button
              key={clave}
              type="button"
              disabled={guardando !== null}
              onClick={() => continuar(clave)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.985] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {guardando === clave ? <Loader2Icon className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icono className="h-5 w-5" aria-hidden="true" />}
              </span>
              <span className="space-y-1">
                <span className="block text-lg font-semibold">{op.titulo}</span>
                <span className="block text-sm text-muted-foreground">{op.descripcion}</span>
              </span>
              <span className="mt-auto text-sm font-medium text-primary">
                {elegido === clave ? "Elegiste esto al registrarte · " : ""}
                {op.accion}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <Button variant="ghost" disabled={guardando !== null} onClick={() => continuar(null)} className="text-muted-foreground">
          {guardando === "omitir" ? "Un momento…" : "Ahora no"}
        </Button>
      </div>
    </div>
  );
}
