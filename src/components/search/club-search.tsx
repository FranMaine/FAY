"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CLUB_ALIASES } from "@/lib/club-aliases";

export interface ClubListItem {
  id: string;
  nombre: string;
  ciudad: string | null;
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
      const alias = CLUB_ALIASES[c.nombre];
      return normalizar(c.nombre).includes(q) || (alias && normalizar(alias).includes(q));
    });
  }, [clubes, query]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar club por nombre..."
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
            <Link key={c.id} href={`/clubes/${c.id}`}>
              <Card className="h-full bg-surface border-border hover:border-primary/50 hover:-translate-y-0.5 transition-[transform,border-color]">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ShieldIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.nombre}</p>
                    {CLUB_ALIASES[c.nombre] && (
                      <p className="text-xs text-muted-foreground truncate">{CLUB_ALIASES[c.nombre]}</p>
                    )}
                    {c.ciudad && <p className="text-xs text-muted-foreground truncate">{c.ciudad}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <UsersIcon className="w-3.5 h-3.5" />
                      {c.regatistasCount} regatista{c.regatistasCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
