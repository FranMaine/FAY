"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2Icon, StarIcon, UserIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useFavoritos } from "@/hooks/use-favoritos";

export interface FavoritoItem {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  club: string | null;
  ultimo: {
    campeonatoId: string;
    campeonato: string;
    clase: string;
    anio: number;
    posicion: number | null;
    totalParticipantes: number;
  } | null;
}

interface Datos {
  perfilUso: "NAVEGANTE" | "FAMILIAR" | "ESPECTADOR" | null;
  favoritos: FavoritoItem[];
}

// Pide la lista completa (con el último resultado de cada uno). Se vuelve a
// pedir cuando cambia la cantidad de favoritos (se agregó o se quitó alguno
// desde cualquier parte de la pantalla).
export function useListaFavoritos() {
  const { autenticado, ids } = useFavoritos();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const clave = [...ids].sort().join(",");

  const recargar = useCallback(async () => {
    try {
      const res = await fetch("/api/favoritos");
      if (!res.ok) throw new Error();
      setDatos(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
  }, [autenticado, clave, recargar]);

  return { autenticado, datos, error, recargar };
}

function Avatar({ nombre, fotoUrl }: { nombre: string; fotoUrl: string | null }) {
  if (fotoUrl) {
    return <Image src={fotoUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
      {nombre ? <span className="text-lg font-bold">{nombre.trim().charAt(0).toUpperCase()}</span> : <UserIcon className="h-5 w-5" />}
    </span>
  );
}

export function TarjetaFavorito({ favorito, onQuitar }: { favorito: FavoritoItem; onQuitar?: () => void }) {
  const u = favorito.ultimo;
  return (
    <div className="relative flex h-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5">
      <Avatar nombre={favorito.nombre} fotoUrl={favorito.fotoUrl} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/regatistas/${favorito.id}`}
          className="block truncate font-bold text-foreground after:absolute after:inset-0 after:rounded-2xl hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
        >
          {favorito.nombre}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{favorito.club || "Sin club"}</p>
        {u ? (
          <p className="mt-2 text-sm">
            {u.posicion !== null && (
              <span className="mr-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {u.posicion}° de {u.totalParticipantes}
              </span>
            )}
            <span className="text-muted-foreground">
              {u.campeonato} {u.anio} · {u.clase}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Todavía no tiene resultados cargados.</p>
        )}
      </div>
      {onQuitar && (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar a ${favorito.nombre} de favoritos`}
          className="relative z-10 -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Grilla de favoritos con el botón para quitar cada uno. Es la que usa la
// pantalla /favoritos.
export function FavoritosLista() {
  const { alternar } = useFavoritos();
  const { autenticado, datos, error } = useListaFavoritos();

  if (!autenticado) return null;
  if (error && !datos) {
    return <p role="alert" className="text-sm text-red-500">No se pudieron cargar tus favoritos. Probá de nuevo en un momento.</p>;
  }
  if (!datos) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando tus favoritos…
      </p>
    );
  }
  if (datos.favoritos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
        <StarIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">Todavía no agregaste a nadie.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Buscá a tus hijos, a tu equipo o a quien quieras seguir, y tocá <strong>Agregar</strong>.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {datos.favoritos.map((f) => (
        <li key={f.id}>
          <TarjetaFavorito
            favorito={f}
            onQuitar={async () => {
              const error = await alternar(f.id);
              if (error) toast.error(error);
              else toast.success(`${f.nombre} salió de tus favoritos`);
            }}
          />
        </li>
      ))}
    </ul>
  );
}
