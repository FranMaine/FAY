"use client";

import { useEffect, useRef, useState } from "react";
import { BinocularsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TAMANIO = 56;
const MARGEN = 8;
// Arriba: debajo de la barra de navegación; abajo: un poco de aire (el botón de
// "volver arriba" vive en la otra esquina, y esta burbuja se puede correr).
const TOPE_SUPERIOR = 76;
const TOPE_INFERIOR = 16;
const CLAVE_STORAGE = "fay-vigia-pos";
const UMBRAL_ARRASTRE_PX = 6;

type Lado = "izquierda" | "derecha";
interface Posicion {
  lado: Lado;
  y: number;
}

function limitarY(y: number): number {
  const maximo = window.innerHeight - TAMANIO - TOPE_INFERIOR;
  return Math.min(Math.max(y, TOPE_SUPERIOR), Math.max(maximo, TOPE_SUPERIOR));
}

function posicionInicial(): Posicion {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_STORAGE) ?? "null") as Posicion | null;
    if (guardada && (guardada.lado === "izquierda" || guardada.lado === "derecha") && Number.isFinite(guardada.y)) {
      return { lado: guardada.lado, y: limitarY(guardada.y) };
    }
  } catch {
    // Sin storage o con un valor roto: se usa la posición de siempre.
  }
  return { lado: "izquierda", y: limitarY(window.innerHeight) };
}

// Botón de VigIA: una burbuja redonda que se puede arrastrar a cualquier
// altura y que, al soltarla, se pega sola al borde izquierdo o derecho (el más
// cercano). Recuerda dónde la dejaste. Un toque simple la abre; arrastrar más de
// unos pocos píxeles NO cuenta como toque (si no, cada movimiento abriría el chat).
export function BurbujaVigia({ onAbrir, oculta }: { onAbrir: () => void; oculta: boolean }) {
  const [pos, setPos] = useState<Posicion | null>(null);
  // Posición en píxeles mientras se arrastra (o se desliza hacia el borde al soltar).
  const [viva, setViva] = useState<{ x: number; y: number } | null>(null);
  const [pegando, setPegando] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const gesto = useRef<{ px: number; py: number; ox: number; oy: number; movio: boolean } | null>(null);
  const acabaDeArrastrar = useRef(false);

  // La posición guardada solo se conoce en el cliente: arranca sin definir (la
  // burbuja se ve igual, abajo a la izquierda, con las clases de abajo) y se
  // corrige dentro de un requestAnimationFrame.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPos(posicionInicial()));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Si cambia el tamaño de la pantalla (girar el celular), no puede quedar fuera.
  useEffect(() => {
    const alCambiar = () => setPos((p) => (p ? { ...p, y: limitarY(p.y) } : p));
    window.addEventListener("resize", alCambiar);
    return () => window.removeEventListener("resize", alCambiar);
  }, []);

  function alPresionar(e: React.PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    gesto.current = { px: e.clientX, py: e.clientY, ox: r.left, oy: r.top, movio: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function alMover(e: React.PointerEvent<HTMLButtonElement>) {
    const g = gesto.current;
    if (!g) return;
    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    if (!g.movio && Math.hypot(dx, dy) < UMBRAL_ARRASTRE_PX) return;
    g.movio = true;
    const x = Math.min(Math.max(g.ox + dx, 0), window.innerWidth - TAMANIO);
    setViva({ x, y: limitarY(g.oy + dy) });
  }

  function alSoltar(e: React.PointerEvent<HTMLButtonElement>) {
    const g = gesto.current;
    gesto.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!g?.movio) return;

    acabaDeArrastrar.current = true;
    const x = Math.min(Math.max(g.ox + (e.clientX - g.px), 0), window.innerWidth - TAMANIO);
    const y = limitarY(g.oy + (e.clientY - g.py));
    const lado: Lado = x + TAMANIO / 2 < window.innerWidth / 2 ? "izquierda" : "derecha";
    const xFinal = lado === "izquierda" ? MARGEN : window.innerWidth - TAMANIO - MARGEN;

    // Se desliza hasta el borde y recién ahí pasa a la posición "fija".
    setPegando(true);
    setViva({ x: xFinal, y });
    window.setTimeout(() => {
      const nueva = { lado, y };
      setPos(nueva);
      setViva(null);
      setPegando(false);
      try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nueva));
      } catch {
        // Sin storage: vuelve a su lugar de siempre en la próxima visita.
      }
    }, 200);
  }

  function alTocar() {
    // Después de arrastrar, el navegador igual dispara un "click": se ignora.
    if (acabaDeArrastrar.current) {
      acabaDeArrastrar.current = false;
      return;
    }
    onAbrir();
  }

  const estilo: React.CSSProperties = viva
    ? { left: viva.x, top: viva.y, right: "auto", bottom: "auto", transition: pegando ? "left 200ms var(--ease-out-strong, ease-out), top 200ms var(--ease-out-strong, ease-out)" : "none" }
    : pos
      ? pos.lado === "izquierda"
        ? { left: `calc(${MARGEN}px + env(safe-area-inset-left, 0px))`, top: pos.y, right: "auto", bottom: "auto" }
        : { right: `calc(${MARGEN}px + env(safe-area-inset-right, 0px))`, top: pos.y, left: "auto", bottom: "auto" }
      : {};

  return (
    <button
      ref={botonRef}
      type="button"
      onClick={alTocar}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      aria-label="Abrir a VigIA, el asistente de IA. Se puede arrastrar para cambiarlo de lugar"
      title="VigIA (arrastrá para moverla)"
      style={estilo}
      className={cn(
        // Antes de conocer la posición guardada: abajo a la izquierda.
        "fixed z-40 flex touch-none select-none items-center justify-center rounded-full border border-border bg-primary-solid text-white shadow-lg active:scale-95",
        !pos && !viva && "bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-[calc(0.5rem+env(safe-area-inset-left,0px))]",
        oculta && "pointer-events-none opacity-0"
      )}
    >
      <span className="flex items-center justify-center" style={{ width: TAMANIO, height: TAMANIO }}>
        <BinocularsIcon className="h-6 w-6" aria-hidden="true" />
      </span>
    </button>
  );
}
