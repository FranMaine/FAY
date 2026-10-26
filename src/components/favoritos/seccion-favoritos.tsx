"use client";

import Link from "next/link";
import { ArrowRightIcon, StarIcon } from "lucide-react";
import { FavoritosLista } from "@/components/favoritos/favoritos-lista";

// Favoritos dentro de Mi perfil, para quien todavía no tiene un perfil de
// regatista vinculado: en vez de una pantalla vacía, ve a las personas que
// sigue. Es la misma lista que /favoritos.
export function SeccionFavoritos() {
  return (
    <section aria-labelledby="mis-favoritos-titulo" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="mis-favoritos-titulo" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <StarIcon className="h-5 w-5 fill-current text-primary" aria-hidden="true" />
          Tus favoritos
        </h2>
        <Link
          href="/favoritos"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Agregar o editar
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <FavoritosLista />
    </section>
  );
}
