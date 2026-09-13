"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Los 3 modales de admin (nuevo campeonato, editar regatista, subir CSV)
// aparecían y desaparecían instantáneo -se montaban/desmontaban con
// `{isOpen && (...)}`, sin ninguna transición. Este wrapper compartido les
// da entrada/salida (fade del fondo + scale 0.95→1, 200ms ease-out -rango
// de duración de modal según la guía de motion) sin que cada uno tenga que
// reimplementar el manejo de mount/unmount demorado que hace falta para
// poder animar la SALIDA (con solo CSS no alcanza: hay que seguir montado
// unos ms más después de que isOpen pasa a false).
const DURACION_MS = 200;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho/alto del panel (ej: "w-full max-w-md", "w-full max-w-4xl max-h-[90vh]") */
  className?: string;
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  // "closing" mantiene el modal montado el tiempo de la transición de
  // salida después de que isOpen pasa a false -sin esto no hay forma de
  // animar el cierre con solo CSS (el componente ya desapareció del DOM).
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Todo el setState va adentro de un callback (rAF), no directo en el
      // cuerpo del efecto -un frame después de montar, así el navegador ya
      // pintó el estado "cerrado" (opacity-0 scale-95) antes de pasar a
      // "abierto"; si se hiciera en el mismo tick no habría transición,
      // arrancaría directo en el estado final.
      const raf = requestAnimationFrame(() => {
        setClosing(false);
        setEntered(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    const raf = requestAnimationFrame(() => {
      setEntered(false);
      setClosing(true);
    });
    const timeout = setTimeout(() => setClosing(false), DURACION_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-200 ease-out",
        entered ? "opacity-100" : "opacity-0"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-surface border border-border rounded-xl shadow-xl overflow-hidden flex flex-col transition-[opacity,transform] duration-200 ease-out",
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
