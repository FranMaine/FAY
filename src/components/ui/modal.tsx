"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Los 3 modales de admin (nuevo campeonato, editar regatista, subir CSV)
// aparecían y desaparecían instantáneo -se montaban/desmontaban con
// `{isOpen && (...)}`, sin ninguna transición. Este wrapper compartido les
// da entrada/salida (fade del fondo + scale 0.95→1, 220ms/150ms con curva fuerte -rango
// de duración de modal según la guía de motion) sin que cada uno tenga que
// reimplementar el manejo de mount/unmount demorado que hace falta para
// poder animar la SALIDA (con solo CSS no alcanza: hay que seguir montado
// unos ms más después de que isOpen pasa a false).
// Entrada de 220 ms (duration-[220ms] abajo), un poco más pausada que la salida: al abrir el usuario mira, al
// cerrar solo quiere que el sistema responda rápido.
const SALIDA_MS = 150;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho/alto del panel (ej: "w-full max-w-md", "w-full max-w-4xl max-h-[90vh]") */
  className?: string;
  /** false: clickear el fondo NO cierra el modal (solo queda el botón de
   * adentro) -para un aviso que quiere asegurarse de que se lea antes de
   * poder seguir navegando. Default true (comportamiento de siempre). */
  closeOnBackdropClick?: boolean;
}

export function Modal({ isOpen, onClose, children, className, closeOnBackdropClick = true }: ModalProps) {
  // "closing" mantiene el modal montado el tiempo de la transición de
  // salida después de que isOpen pasa a false -sin esto no hay forma de
  // animar el cierre con solo CSS (el componente ya desapareció del DOM).
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  // Si el modal arranca cerrado (el caso normal: nunca se abrió), el
  // efecto de abajo no debe reproducir la animación de "salida" -antes lo
  // hacía igual en cada montaje, dejando unos ms (o más, si el frame se
  // demora) una capa fixed inset-0 invisible pero SIN pointer-events-none
  // tapando toda la pantalla -eso es lo que absorbía el click sobre VigIA
  // al entrar a /admin sin haber visto nunca el aviso.
  const montadoAbierto = useRef(isOpen);

  useEffect(() => {
    if (isOpen) {
      montadoAbierto.current = true;
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

    if (!montadoAbierto.current) return;

    const raf = requestAnimationFrame(() => {
      setEntered(false);
      setClosing(true);
    });
    const timeout = setTimeout(() => setClosing(false), SALIDA_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity ease-out-strong motion-reduce:transition-none",
        entered ? "opacity-100 duration-[220ms]" : "pointer-events-none opacity-0 duration-150"
      )}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={cn(
          "bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col transition-[opacity,transform] ease-out-strong motion-reduce:transition-none",
          entered ? "opacity-100 scale-100 duration-[220ms]" : "opacity-0 scale-[0.96] duration-150",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
