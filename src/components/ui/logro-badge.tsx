import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LogroDef, LogroDesbloqueado } from "@/lib/logros";

interface LogroBadgeProps {
  logro: LogroDef;
  desbloqueado?: LogroDesbloqueado;
}

// Una medalla del perfil de regatista: desbloqueada se ve a color, sin
// desbloquear queda en blanco y negro y más tenue -el mismo lenguaje que
// usan la mayoría de los sistemas de logros (Xbox, Duolingo, etc.), para
// que de un vistazo se note cuáles le faltan sin tener que leer nada. El
// detalle (en qué campeonato lo consiguió) va en el title nativo -no hay
// un componente de tooltip en el proyecto, y uno a medida para esto solo
// sería peso extra.
export function LogroBadge({ logro, desbloqueado }: LogroBadgeProps) {
  const titulo = desbloqueado?.detalle
    ? `${logro.nombre} — ${desbloqueado.detalle}\n${logro.descripcion}`
    : `${logro.nombre} (sin desbloquear)\n${logro.descripcion}`;

  return (
    <div
      className="group flex flex-col items-center gap-1.5 text-center w-20 sm:w-24"
      title={titulo}
    >
      <div
        className={cn(
          "relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 transition-transform",
          desbloqueado ? "group-hover:scale-105" : "opacity-35 grayscale"
        )}
      >
        <Image src={`/logros/${logro.icono}`} alt={logro.nombre} fill sizes="64px" className="object-contain" />
      </div>
      <span className={cn("text-[11px] sm:text-xs font-medium leading-tight", desbloqueado ? "text-foreground" : "text-muted-foreground")}>
        {logro.nombre}
      </span>
    </div>
  );
}
