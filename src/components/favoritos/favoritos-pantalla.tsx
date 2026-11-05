"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgregarFavoritos } from "@/components/favoritos/agregar-favoritos";
import { FavoritosLista } from "@/components/favoritos/favoritos-lista";

// Pantalla /favoritos: la lista es lo principal, y el buscador para sumar a
// alguien más se despliega recién al tocar "Agregar más".
export function FavoritosPantalla() {
  const [buscando, setBuscando] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="lista-titulo" className="text-lg font-semibold">
          Tu lista
        </h2>
        <Button
          type="button"
          size="sm"
          variant={buscando ? "ghost" : "outline"}
          className="gap-1.5"
          aria-expanded={buscando}
          aria-controls="panel-agregar"
          onClick={() => setBuscando((v) => !v)}
        >
          {buscando ? <XIcon className="h-4 w-4" aria-hidden="true" /> : <PlusIcon className="h-4 w-4" aria-hidden="true" />}
          {buscando ? "Cerrar" : "Agregar más"}
        </Button>
      </div>

      {buscando && (
        <section id="panel-agregar" aria-label="Agregar a alguien" className="rounded-2xl border border-border bg-surface p-5">
          <AgregarFavoritos />
        </section>
      )}

      <section aria-labelledby="lista-titulo">
        <FavoritosLista />
      </section>
    </div>
  );
}
