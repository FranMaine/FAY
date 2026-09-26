"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CLUB_ALIASES } from "@/lib/club-aliases";
import { ClubAvatar } from "@/components/icons/club-avatar";

export interface ClubListItem {
  id: string;
  nombre: string;
  ciudad: string | null;
  logoUrl: string | null;
  nombreCompleto: string | null;
  regatistasCount: number;
}

// Quita acentos y pasa a minúsculas para que buscar "nautico" encuentre
// "Náutico" -no reordena palabras (a diferencia de normalizarNombre en
// src/lib/nombres.ts, pensado para detectar duplicados, no para filtrar
// una lista mientras se escribe).
function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

interface ClubSearchProps {
  clubes: ClubListItem[];
}

// Filtro 100% en el cliente -180 clubes es poco como para justificar un
// endpoint de búsqueda con ida y vuelta al servidor en cada letra
// tecleada; se traen todos una vez (ya vienen del server component
// padre) y se filtran acá mismo, instantáneo.
export function ClubSearch({ clubes }: ClubSearchProps) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = normalizar(query);
    if (!q) return clubes;
    return clubes.filter((c) => {
      const alias = c.nombreCompleto || CLUB_ALIASES[c.nombre];
      return normalizar(c.nombre).includes(q) || (alias && normalizar(alias).includes(q));
    });
  }, [clubes, query]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar club por nombre…"
          className="pl-9 bg-surface border-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-surface rounded-xl border border-dashed border-border">
          No se encontró ningún club con ese nombre.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((c) => (
            <Link key={c.id} href={`/clubes/${c.id}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="flex h-full items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-primary/5">
                <ClubAvatar nombre={c.nombre} logoUrl={c.logoUrl} className="w-14 h-14 text-base" transitionName={`club-${c.id}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.nombre}</p>
                  {(c.nombreCompleto || CLUB_ALIASES[c.nombre]) && (
                    <p className="text-sm text-muted-foreground truncate">{c.nombreCompleto || CLUB_ALIASES[c.nombre]}</p>
                  )}
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <UsersIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="tabular-nums">{c.regatistasCount}</span> regatista{c.regatistasCount === 1 ? "" : "s"}
                    {c.ciudad && <span className="text-muted-foreground font-normal">· {c.ciudad}</span>}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
