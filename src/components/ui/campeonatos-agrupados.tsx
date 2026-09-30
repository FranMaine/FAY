import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon, SailboatIcon } from "lucide-react";
import { CampeonatoCard, type Campeonato } from "@/components/ui/campeonato-card";
import { ClaseIcon } from "@/components/icons/clase-icons";
import { slugificar } from "@/lib/slug";

// Un mismo evento (ej: "Vela Fest 2026") se carga como un Campeonato por
// clase -agrupar por nombre+año evita mostrar decenas de tarjetas casi
// idénticas. La tarjeta del evento lleva a su propia página
// (/campeonatos/evento/[anio]/[slug], igual que un club lleva a
// /clubes/[id]) con el listado de sus categorías -antes se desplegaba en
// el lugar, pero el logo quedaba diminuto adentro de un recuadro chico y
// la tarjeta no daba lugar a mostrarlo bien.
export function CampeonatosAgrupados({ campeonatos }: { campeonatos: Campeonato[] }) {
  const map = new Map<string, { nombre: string; anio: number; items: Campeonato[] }>();
  for (const c of campeonatos) {
    const nombreGrupo = c.evento?.trim() || c.nombre;
    const clave = `${nombreGrupo.toLowerCase()}__${c.anio}`;
    if (!map.has(clave)) map.set(clave, { nombre: nombreGrupo, anio: c.anio, items: [] });
    map.get(clave)!.items.push(c);
  }
  const grupos = [...map.entries()].map(([clave, g]) => ({
    clave,
    ...g,
    // Logo propio del evento: el de cualquiera de sus campeonatos que
    // tenga uno cargado (en la práctica todos comparten el mismo).
    logoUrl: g.items.find((c) => c.logoUrl)?.logoUrl ?? null,
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {grupos.map((g) => {
        if (g.items.length === 1) return <CampeonatoCard key={g.clave} campeonato={g.items[0]} />;
        return (
          <Link
            key={g.clave}
            href={`/campeonatos/evento/${g.anio}/${slugificar(g.nombre)}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-surface p-5 transition-[transform,border-color] duration-200 ease-out-strong hover:-translate-y-1 active:scale-[0.985] hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between gap-3">
              {g.logoUrl ? (
                <ViewTransition name={`evento-logo-${g.anio}-${slugificar(g.nombre)}`} share="morph" default="none">
                  <Image src={g.logoUrl} alt="" width={320} height={160} className="h-16 w-auto max-w-[220px] shrink-0 rounded-xl border border-border bg-primary-solid object-contain p-1.5" />
                </ViewTransition>
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <SailboatIcon className="h-8 w-8" />
                </span>
              )}
              <ArrowUpRightIcon className="h-5 w-5 shrink-0 text-primary opacity-0 transition-[opacity,transform] duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden="true" />
            </div>
            <p className="mt-4 text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{g.nombre}</p>
            <p className="mt-1 text-sm font-mono text-primary">{g.anio}</p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-6">
              <p className="text-sm text-muted-foreground">{g.items.length} categorías</p>
              <span className="flex -space-x-1.5" aria-hidden="true">
                {g.items.slice(0, 5).map((c) => (
                  <span key={c.id} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface">
                    <ClaseIcon nombreClase={c.clase} className="h-4 w-4 object-contain" />
                  </span>
                ))}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
