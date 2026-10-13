'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import Link from 'next/link';

// Quita acentos y pasa a minúsculas -mismo criterio que SelectorBuscable,
// así "jose" encuentra "José".
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export interface ClasificacionRegatista {
  id: string;
  posicion: number;
  nombre: string;
  club: string;
  // Presente cuando la fila junta a una tripulación de más de una persona
  // (ej: "Fulano & Mengano" en un 29er) -cada una con su propio id, para
  // poder linkear al perfil de cada una en vez de solo al de `id`.
  integrantes?: { regatistaId: string; nombre: string }[];
  puntajes: Array<{
    regata: number;
    puntos: number;
    descartado: boolean;
    observacion?: string; // DNF, DSQ, etc.
  }>;
  totalNeto: number;
  // Columnas "personalizadas" que el admin conservó al importar (ej:
  // "Categoría", "DNI"). No todas las filas tienen las mismas claves -una
  // fila sin valor para una columna extra simplemente no la trae.
  datosExtra?: Record<string, string> | null;
}

interface ResultadosTableProps {
  clasificacion: ClasificacionRegatista[];
  regatas: number[];
  // Nombres de las columnas personalizadas a mostrar, en orden -la unión de
  // las que trae cada fila, calculada por quien arma `clasificacion`.
  columnasExtra?: string[];
}

// Anillo de foco visible para quien navega con teclado: en una tabla de 90
// filas, sin esto no hay forma de saber en cuál link está parado el Tab.
const FOCO_LINK = 'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function NombreRegatista({ row, className }: { row: ClasificacionRegatista; className?: string }) {
  if (!row.integrantes || row.integrantes.length < 2) {
    return (
      <Link href={`/regatistas/${row.id}`} className={cn(FOCO_LINK, className)}>
        {row.nombre}
      </Link>
    );
  }

  return (
    <>
      {row.integrantes.map((persona, i) => (
        <span key={persona.regatistaId}>
          {i > 0 && ' & '}
          <Link href={`/regatistas/${persona.regatistaId}`} className={cn(FOCO_LINK, className)}>
            {persona.nombre}
          </Link>
        </span>
      ))}
    </>
  );
}

export function ResultadosTable({ clasificacion, regatas, columnasExtra = [] }: ResultadosTableProps) {
  const [busqueda, setBusqueda] = useState('');

  const getPositionBadgeVariant = (pos: number) => {
    if (pos === 1) return 'accent'; // Gold
    if (pos === 2) return 'default'; // Silver/Blue
    if (pos === 3) return 'success'; // Bronze/Green
    return 'muted';
  };

  // Filtra por el nombre de la fila O el de cualquier integrante (en una
  // tripulación de más de una persona, "Fulano & Mengano" tiene que
  // encontrarse buscando "Mengano" también, no solo por el primer nombre).
  const clasificacionFiltrada = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return clasificacion;
    return clasificacion.filter((row) => {
      const nombres = row.integrantes?.length ? row.integrantes.map((i) => i.nombre) : [row.nombre];
      return nombres.some((n) => normalizar(n).includes(q)) || normalizar(row.club).includes(q);
    });
  }, [clasificacion, busqueda]);

  return (
    <div className="w-full space-y-4">
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar regatista en esta tabla…"
          className="pl-9"
          aria-label="Buscar regatista en la clasificación"
        />
      </div>

      {busqueda.trim() && clasificacionFiltrada.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          Nadie en esta clasificación coincide con &quot;{busqueda}&quot;.
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {clasificacionFiltrada.map((row) => (
          <div key={row.id} className="bg-surface rounded-xl border border-border p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <Badge variant={getPositionBadgeVariant(row.posicion)} className="text-sm px-2 py-1 font-mono">
                  {row.posicion}
                </Badge>
                <div>
                  <div className="font-semibold text-foreground">
                    <NombreRegatista row={row} className="hover:text-primary transition-colors" />
                  </div>
                  <div className="text-xs text-muted">{row.club}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Total</div>
                <div className="font-mono font-bold text-primary">{row.totalNeto}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 border-t border-border pt-3">
              {row.puntajes.map((p) => (
                <div key={p.regata} className="text-center">
                  <div className="text-[10px] text-muted mb-1">R{p.regata}</div>
                  <div className={cn(
                    "font-mono text-sm",
                    p.descartado && "line-through text-muted",
                    p.observacion && "text-error"
                  )}>
                    {p.observacion ? p.observacion : p.puntos}
                  </div>
                </div>
              ))}
            </div>

            {columnasExtra.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 mt-3 text-xs">
                {columnasExtra.map((campo) => (
                  row.datosExtra?.[campo] ? (
                    <div key={campo}>
                      <span className="text-muted">{campo}: </span>
                      <span className="text-foreground">{row.datosExtra[campo]}</span>
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted uppercase bg-surface-hover border-b border-border">
            <tr>
              <th scope="col" className="px-4 py-3 sticky left-0 bg-surface-hover z-10">Pos</th>
              <th scope="col" className="px-4 py-3 sticky left-[60px] bg-surface-hover z-10">Timonel/Tripulación</th>
              <th scope="col" className="px-4 py-3">Club</th>
              {regatas.map((r) => (
                <th key={r} scope="col" className="px-4 py-3 text-center">R{r}</th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">Neto</th>
              {columnasExtra.map((campo) => (
                <th key={campo} scope="col" className="px-4 py-3 whitespace-nowrap">{campo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clasificacionFiltrada.map((row, idx) => (
              <tr key={row.id} className={cn(
                "group border-b border-border hover:bg-surface-hover/50 transition-colors",
                idx === clasificacionFiltrada.length - 1 && "border-0"
              )}>
                {/* Las celdas sticky tienen fondo sólido (para tapar lo que
                    scrollea por detrás), así que el hover/50 de la fila no
                    las alcanzaba y quedaba una franja de otro color sobre
                    el nombre. group-hover aplica el MISMO tono -50% de
                    surface-hover sobre surface- pero ya mezclado, sin
                    transparencia. */}
                <td className="px-4 py-3 sticky left-0 bg-surface z-10 transition-colors group-hover:bg-[color-mix(in_srgb,var(--color-surface-hover)_50%,var(--color-surface))]">
                  <Badge variant={getPositionBadgeVariant(row.posicion)} className="font-mono">
                    {row.posicion}
                  </Badge>
                </td>
                <th scope="row" className="px-4 py-3 sticky left-[60px] bg-surface z-10 text-left font-medium text-foreground whitespace-nowrap transition-colors group-hover:bg-[color-mix(in_srgb,var(--color-surface-hover)_50%,var(--color-surface))]">
                  <NombreRegatista row={row} className="hover:text-primary transition-colors hover:underline" />
                </th>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{row.club}</td>
                {regatas.map((r) => {
                  const p = row.puntajes.find(score => score.regata === r);
                  return (
                    <td key={r} className="px-4 py-3 text-center font-mono">
                      {p ? (
                        <span className={cn(
                          p.descartado && "line-through text-muted",
                          p.observacion && "text-error font-medium"
                        )}>
                          {p.observacion ? p.observacion : p.puntos}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                  {row.totalNeto}
                </td>
                {columnasExtra.map((campo) => (
                  <td key={campo} className="px-4 py-3 text-muted whitespace-nowrap">
                    {row.datosExtra?.[campo] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
