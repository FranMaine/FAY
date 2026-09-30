"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { LayoutGridIcon } from "lucide-react";
import { ClaseIcon, slugDeClase } from "@/components/icons/clase-icons";
import { cn } from "@/lib/utils";

interface RankingFiltersProps {
  clases: { id: string; nombre: string }[];
  anios: number[];
  currentClaseId: string;
  currentAnio: number;
}

// Iniciales de una clase que no tiene logo entre los 10 procesados (ver
// clase-icons.tsx) -mismo criterio que ClubAvatar para clubes sin escudo:
// mejor dos letras que un espacio vacío o un ícono genérico repetido.
function inicialesDeClase(nombre: string): string {
  const limpio = nombre.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function RankingFilters({ clases, anios, currentClaseId, currentAnio }: RankingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-surface border border-border rounded-2xl mb-8">
      <div className="space-y-1.5 min-w-0">
        <span id="filtro-clase-label" className="text-sm font-medium text-muted-foreground">Clase</span>
        {/* Antes era un <select> nativo -acá el logo de cada clase importa
            más que el nombre para reconocerla de un vistazo, y un <select>
            no puede mostrar imágenes dentro de sus opciones en ningún
            navegador. Fila de chips con scroll horizontal en vez de eso;
            "Todas" no tiene logo propio (no representa ninguna clase real)
            y las clases sin uno de los 10 logos procesados caen a sus
            iniciales, igual que ClubAvatar con los clubes sin escudo. */}
        <div role="group" aria-labelledby="filtro-clase-label" className="flex items-start gap-2 overflow-x-auto pb-1 -mb-1">
          {clases.map((c) => {
            const activa = currentClaseId === c.id;
            const tieneLogo = c.id !== "ALL" && slugDeClase(c.nombre) !== null;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={activa}
                onClick={() => router.push("?" + createQueryString("clase", c.id))}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-colors duration-150",
                  activa
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {c.id === "ALL" ? (
                  <LayoutGridIcon className="h-7 w-7" />
                ) : tieneLogo ? (
                  <ClaseIcon nombreClase={c.nombre} className="h-7 w-7 object-contain" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {inicialesDeClase(c.nombre)}
                  </span>
                )}
                {/* Antes truncaba a una línea con "..." -"Optimist
                    Principiantes" quedaba como "Optim...", ilegible. Ahora
                    envuelve en hasta 2 líneas (w-20 = 80px, suficiente para
                    "Principiantes"/"(Laser Radial)" en la segunda línea de
                    los nombres reales más largos) en vez de cortar texto. */}
                <span className="w-20 text-center text-[11px] font-medium leading-tight">{c.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1 sm:max-w-xs">
        <label htmlFor="filtro-anio" className="text-sm font-medium text-muted-foreground">Temporada (Año)</label>
        <select
          id="filtro-anio"
          className="w-full h-11 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          value={currentAnio.toString()}
          onChange={(e) => {
            router.push("?" + createQueryString("anio", e.target.value));
          }}
        >
          {anios.map((a) => (
            <option key={a} value={a.toString()}>{a === 0 ? "Todos los años" : a}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
