"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface RankingFiltersProps {
  clases: { id: string; nombre: string }[];
  anios: number[];
  currentClaseId: string;
  currentAnio: number;
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
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-surface border border-border rounded-lg mb-8">
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Clase</label>
        <select 
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          value={currentClaseId}
          onChange={(e) => {
            router.push("?" + createQueryString("clase", e.target.value));
          }}
        >
          {clases.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Temporada (Año)</label>
        <select 
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
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
