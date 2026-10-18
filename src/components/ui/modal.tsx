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

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Nombre accesible del diálogo (lo lee el lector de pantalla al abrirse). */
  ariaLabel?: string;
  /** Ancho/alto del panel (ej: "w-full max-w-md", "w-full max-w-4xl max-h-[90vh]") */
  className?: string;
  /** false: clickear el fondo NO cierra el modal (solo queda el botón de
   * adentro) -para un aviso que quiere asegurarse de que se lea antes de
   * poder seguir navegando. Default true (comportamiento de siempre). */
  closeOnBackdropClick?: boolean;
}

export function Modal({ isOpen, onClose, children, ariaLabel, className, closeOnBackdropClick = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Los callers pasan onClose como función inline (cambia en cada render):
  // si el efecto de foco dependiera de ella, se re-correría con cada tecla
  // tipeada en un input del modal y le robaría el foco. Se lee de un ref.
  const onCloseRef = useRef(onClose);
  const cerrarConEscRef = useRef(closeOnBackdropClick);
  useEffect(() => {
    onCloseRef.current = onClose;
    cerrarConEscRef.current = closeOnBackdropClick;
  });

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

  // Foco y teclado mientras está abierto: el foco entra al diálogo (al
  // panel, no al primer campo -así en el celular no salta el teclado
  // solo), Tab/Shift+Tab quedan atrapados adentro en vez de irse a la
  // página de atrás, Esc cierra (salvo en los avisos que no se pueden
  // descartar tocando afuera), y al cerrar el foco vuelve a lo que lo
  // abrió. Un Esc que un hijo ya "consumió" (ej: cerrar la lista de un
  // selector buscable) no cierra el modal.
  useEffect(() => {
    if (!isOpen) return;
    const previo = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (!e.defaultPrevented && cerrarConEscRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLES)).filter(
        (el) => el.getClientRects().length > 0
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const primero = items[0];
      const ultimo = items[items.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || activo === panel)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      if (previo && document.contains(previo)) previo.focus();
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          // max-h + scroll propio: en un celular chico (o con el teclado abierto) un
          // modal alto -el de vinculación, con sus campos- quedaba cortado arriba y
          // abajo, sin forma de llegar a los botones. dvh descuenta la barra del
          // navegador móvil; un max-h de la pantalla que lo usa gana sobre este.
          "bg-surface border border-border rounded-2xl shadow-xl overflow-y-auto overscroll-contain max-h-[calc(100dvh-2rem)] flex flex-col outline-none transition-[opacity,transform] ease-out-strong motion-reduce:transition-none",
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
