"use client";

import Link from "next/link";
import { ArrowRightIcon, StarIcon } from "lucide-react";
import { TarjetaFavorito, useListaFavoritos } from "@/components/favoritos/favoritos-lista";

// Franja de favoritos en el inicio: aparece solo para quien tiene sesión y
// ya agregó a alguien (o eligió "familiar" y todavía no agregó a nadie, para
// invitarlo a hacerlo). La portada sigue siendo estática y la misma para
// todos: esto se completa en el navegador después de cargar.
export function FavoritosInicio() {
  const { autenticado, datos } = useListaFavoritos();

  if (!autenticado || !datos) return null;

  const vacios = datos.favoritos.length === 0;
  if (vacios && datos.perfilUso !== "FAMILIAR") return null;

  return (
    <section aria-labelledby="favoritos-titulo" className="px-6 pt-14 max-w-7xl mx-auto w-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="favoritos-titulo" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <StarIcon className="h-5 w-5 fill-current text-primary" aria-hidden="true" />
          Tus favoritos
        </h2>
        <Link
          href="/favoritos"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {vacios ? "Agregar" : "Ver todos"}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {vacios ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-6 text-sm text-muted-foreground">
          Agregá a tus hijos o familiares para ver sus resultados apenas entrás, y recibir un mail cuando se publique un campeonato en el que figuran.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {datos.favoritos.slice(0, 6).map((f) => (
            <li key={f.id}>
              <TarjetaFavorito favorito={f} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
