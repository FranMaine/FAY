"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Podio, type ItemPodio } from "@/components/ranking/podio";
import { cn } from "@/lib/utils";

export interface PodioDeClase {
  claseId: string;
  clase: string;
  items: ItemPodio[];
}

// Vista previa del ranking en la portada: el top 3 de cada clase de la
// temporada más reciente, con un selector de clase. Los datos llegan ya
// calculados desde el servidor (ver page.tsx); acá solo se elige cuál mostrar.
export function PodioPortada({ podios, anio }: { podios: PodioDeClase[]; anio: number }) {
  const [activa, setActiva] = useState(podios[0]?.claseId);
  const actual = podios.find((p) => p.claseId === activa) ?? podios[0];
  if (!actual) return null;

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight">Rankings</h3>
          <p className="mt-1 text-muted-foreground">Quién va primero en cada clase, temporada {anio}.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir clase">
          {podios.map((p) => (
            <button
              key={p.claseId}
              type="button"
              onClick={() => setActiva(p.claseId)}
              aria-pressed={p.claseId === actual.claseId}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                p.claseId === actual.claseId
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {p.clase}
            </button>
          ))}
        </div>
      </div>

      <Podio items={actual.items} />

      <Link
        href={`/rankings?clase=${actual.claseId}&anio=${anio}`}
        className="group mt-auto inline-flex items-center gap-1 self-start font-medium text-primary hover:underline"
      >
        Ver ranking completo de {actual.clase}
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </div>
  );
}
