import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ItemPodio {
  id: string;
  href: string;
  titulo: string;
  subtitulo?: string | null;
  puntos: number;
  /** Nodo opcional a la izquierda del título (ej: escudo del club). */
  avatar?: React.ReactNode;
}

// Los tres primeros puestos, con el 1° más grande y elevado. En pantallas
// angostas se apilan en orden 1-2-3 (el orden visual 2-1-3 solo tiene
// sentido cuando hay ancho para verlos lado a lado).
const ESTILOS = [
  { pos: 1, orden: "sm:order-2", alto: "sm:-mt-4 sm:pb-8", medalla: "bg-yellow-400 text-yellow-950", borde: "border-yellow-400/50", brillo: "from-yellow-400/20" },
  { pos: 2, orden: "sm:order-1", alto: "", medalla: "bg-slate-300 text-slate-900", borde: "border-slate-300/40", brillo: "from-slate-300/15" },
  { pos: 3, orden: "sm:order-3", alto: "", medalla: "bg-amber-700 text-amber-50", borde: "border-amber-700/50", brillo: "from-amber-700/20" },
];

export function Podio({ items, unidad = "pts" }: { items: ItemPodio[]; unidad?: string }) {
  if (items.length < 3) return null;
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-end" aria-label="Podio">
      {ESTILOS.map((e, i) => {
        const item = items[i];
        return (
          <li key={item.id} className={cn(e.orden)}>
            <Link
              href={item.href}
              className={cn(
                "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-b to-surface bg-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1",
                e.borde,
                e.brillo,
                e.alto
              )}
            >
              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold", e.medalla)} aria-label={`Puesto ${e.pos}`}>
                {e.pos}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                {item.avatar && <span className="shrink-0 [&_img]:rounded-lg [&_img]:bg-white/90 [&_img]:p-1">{item.avatar}</span>}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold group-hover:text-primary transition-colors">{item.titulo}</p>
                  {item.subtitulo && <p className="truncate text-sm text-muted-foreground">{item.subtitulo}</p>}
                </div>
              </div>
              <p className="mt-auto text-3xl font-extrabold tracking-tight tabular-nums">
                {item.puntos.toLocaleString("es-AR")} <span className="text-sm font-medium text-muted-foreground">{unidad}</span>
              </p>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
