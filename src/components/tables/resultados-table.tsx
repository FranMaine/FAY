'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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
}

interface ResultadosTableProps {
  clasificacion: ClasificacionRegatista[];
  regatas: number[];
}

function NombreRegatista({ row, className }: { row: ClasificacionRegatista; className?: string }) {
  if (!row.integrantes || row.integrantes.length < 2) {
    return (
      <Link href={`/regatistas/${row.id}`} className={className}>
        {row.nombre}
      </Link>
    );
  }

  return (
    <>
      {row.integrantes.map((persona, i) => (
        <span key={persona.regatistaId}>
          {i > 0 && ' & '}
          <Link href={`/regatistas/${persona.regatistaId}`} className={className}>
            {persona.nombre}
          </Link>
        </span>
      ))}
    </>
  );
}

export function ResultadosTable({ clasificacion, regatas }: ResultadosTableProps) {
  const getPositionBadgeVariant = (pos: number) => {
    if (pos === 1) return 'accent'; // Gold
    if (pos === 2) return 'default'; // Silver/Blue
    if (pos === 3) return 'success'; // Bronze/Green
    return 'muted';
  };

  return (
    <div className="w-full">
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {clasificacion.map((row) => (
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
            </tr>
          </thead>
          <tbody>
            {clasificacion.map((row, idx) => (
              <tr key={row.id} className={cn(
                "border-b border-border hover:bg-surface-hover/50 transition-colors",
                idx === clasificacion.length - 1 && "border-0"
              )}>
                <td className="px-4 py-3 sticky left-0 bg-surface z-10">
                  <Badge variant={getPositionBadgeVariant(row.posicion)} className="font-mono">
                    {row.posicion}
                  </Badge>
                </td>
                <td className="px-4 py-3 sticky left-[60px] bg-surface z-10 font-medium text-foreground whitespace-nowrap">
                  <NombreRegatista row={row} className="hover:text-primary transition-colors hover:underline" />
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
