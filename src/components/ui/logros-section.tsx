"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { LOGROS, type LogroDef, type LogroDesbloqueado } from "@/lib/logros-catalogo";

interface LogrosSectionProps {
  logros: LogroDesbloqueado[];
}

// Grilla de las 21 medallas del perfil + el modal de detalle que se abre al
// tocar una. Un solo Modal compartido (no uno por medalla) controlado por
// cuál está seleccionada -más liviano que montar 21 modales por las dudas.
//
// El ícono ya trae su propio color (dorado/azul/bronce según el logro) en
// vez de currentColor: no hace falta un circulo de fondo con texture propia
// -el circulo bg-primary/10 de atrás es solo el mismo lenguaje que ya usa
// el resto del sitio para "ícono dentro de un círculo" (ver el placeholder
// de foto de perfil en /regatistas/[id] o el badge de la 404), no un color
// por-logro.
export function LogrosSection({ logros }: LogrosSectionProps) {
  const desbloqueados = new Map(logros.map((l) => [l.id, l]));
  const [seleccionado, setSeleccionado] = useState<LogroDef | null>(null);
  const detalle = seleccionado ? desbloqueados.get(seleccionado.id) : undefined;

  return (
    <>
      <div className="flex flex-wrap gap-x-2 gap-y-4 sm:gap-x-4">
        {LOGROS.map((logro) => {
          const d = desbloqueados.get(logro.id);
          return (
            <button
              key={logro.id}
              type="button"
              onClick={() => setSeleccionado(logro)}
              aria-label={`Ver detalle del logro ${logro.nombre}`}
              className="group flex flex-col items-center gap-1.5 text-center w-20 sm:w-24 rounded-xl p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div
                className={cn(
                  "relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-primary/10 transition-transform group-hover:scale-105 group-active:scale-95",
                  !d && "opacity-40 grayscale"
                )}
              >
                <Image src={`/logros/${logro.icono}`} alt="" fill sizes="64px" className="object-contain p-2.5" />
              </div>
              <span className={cn("text-[11px] sm:text-xs font-medium leading-tight", d ? "text-foreground" : "text-muted-foreground")}>
                {logro.nombre}
              </span>
            </button>
          );
        })}
      </div>

      <Modal isOpen={!!seleccionado} onClose={() => setSeleccionado(null)} className="w-full max-w-sm">
        {seleccionado && (
          <div className="p-6 text-center space-y-4">
            <div
              className={cn(
                "relative h-20 w-20 mx-auto rounded-full bg-primary/10",
                !detalle && "opacity-40 grayscale"
              )}
            >
              <Image src={`/logros/${seleccionado.icono}`} alt="" fill sizes="80px" className="object-contain p-3.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{seleccionado.nombre}</h3>
              <p className="text-sm text-muted-foreground mt-1">{seleccionado.descripcion}</p>
            </div>
            {detalle ? (
              <p className="text-sm font-medium text-primary">
                {detalle.detalle ? `Conseguida en ${detalle.detalle}` : "¡Conseguida!"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Todavía no la desbloqueó</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
