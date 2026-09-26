import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowUpRight } from 'lucide-react';
import { ClaseIcon } from '@/components/icons/clase-icons';

export interface Campeonato {
  id: string;
  nombre: string;
  evento?: string | null;
  anio: number;
  clase: string;
  sede: string;
  fechaInicio: string;
  estado: 'PUBLICADO' | 'BORRADOR';
  totalRegatistas: number;
}

interface CampeonatoCardProps {
  campeonato: Campeonato;
}

// Jerarquía: el nombre del campeonato es lo primero que se lee, la clase
// (con su logo) lo identifica de un vistazo, y fecha/sede/inscriptos van
// como datos secundarios. Antes la clase y un cartel "PUBLICADO" (que en
// esta pantalla pública es siempre el mismo, no informa nada) competían en
// la parte de arriba con el mismo peso que el título; ahora solo se marca el
// estado cuando NO es el esperado (un borrador).
export function CampeonatoCard({ campeonato }: CampeonatoCardProps) {
  const tieneSede = campeonato.sede && campeonato.sede !== 'Sin sede';
  return (
    <Link
      href={`/campeonatos/${campeonato.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-[transform,border-color,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-primary/5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <ClaseIcon nombreClase={campeonato.clase} className="h-5 w-5 shrink-0 object-contain" />
            {campeonato.clase}
          </span>
          <span className="flex items-center gap-2">
            {campeonato.estado === 'BORRADOR' && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                Borrador
              </span>
            )}
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">{campeonato.anio}</span>
          </span>
        </div>

        <h3 className="mt-5 line-clamp-2 text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {campeonato.nombre}
        </h3>

        <dl className="mt-auto grid gap-1.5 pt-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Fecha</dt>
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dd className="tabular-nums">
              {new Date(campeonato.fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </dd>
          </div>
          {tieneSede && (
            <div className="flex items-center gap-2 min-w-0">
              <dt className="sr-only">Sede</dt>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <dd className="truncate">{campeonato.sede}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <dt className="sr-only">Inscriptos</dt>
            <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dd className="tabular-nums">{campeonato.totalRegatistas} inscriptos</dd>
          </div>
        </dl>

        <ArrowUpRight
          className="absolute bottom-5 right-5 h-5 w-5 text-primary opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
          aria-hidden="true"
        />
      </article>
    </Link>
  );
}
