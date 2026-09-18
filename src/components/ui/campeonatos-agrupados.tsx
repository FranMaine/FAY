"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, FolderIcon } from "lucide-react";
import { CampeonatoCard, type Campeonato } from "@/components/ui/campeonato-card";
import { cn } from "@/lib/utils";

// Un mismo evento (ej: "Vela Fest 2026") se carga como un Campeonato por
// clase -agrupar por nombre+año evita mostrar decenas de tarjetas casi
// idénticas: el evento es una carpeta que al abrirse muestra sus categorías.
export function CampeonatosAgrupados({ campeonatos }: { campeonatos: Campeonato[] }) {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => {
    const map = new Map<string, { nombre: string; anio: number; items: Campeonato[] }>();
    for (const c of campeonatos) {
      const clave = `${c.nombre.trim().toLowerCase()}__${c.anio}`;
      if (!map.has(clave)) map.set(clave, { nombre: c.nombre, anio: c.anio, items: [] });
      map.get(clave)!.items.push(c);
    }
    return [...map.entries()].map(([clave, g]) => ({ clave, ...g }));
  }, [campeonatos]);

  function toggle(clave: string) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {grupos.map((g) => {
        if (g.items.length === 1) return <CampeonatoCard key={g.clave} campeonato={g.items[0]} />;
        const abierta = abiertas.has(g.clave);
        return (
          <div key={g.clave} className={cn("contents")}>
            <button
              type="button"
              onClick={() => toggle(g.clave)}
              aria-expanded={abierta}
              className="text-left rounded-xl border border-border bg-surface p-5 h-full flex flex-col transition-[transform,border-color] duration-200 ease-out hover:scale-[1.02] hover:border-primary/50"
            >
              <div className="flex justify-between items-start mb-4">
                <FolderIcon className="w-7 h-7 text-primary" />
                <ChevronDownIcon className={cn("w-5 h-5 text-muted transition-transform", abierta && "rotate-180")} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-2">{g.nombre}</h3>
              <p className="text-sm text-primary mb-4 font-mono">{g.anio}</p>
              <p className="mt-auto text-sm text-muted">{g.items.length} categorías</p>
            </button>
            {abierta && g.items.map((c) => <CampeonatoCard key={c.id} campeonato={c} />)}
          </div>
        );
      })}
    </div>
  );
}
