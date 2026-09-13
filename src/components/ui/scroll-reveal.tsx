"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Retraso en ms, para escalonar varios ScrollReveal seguidos (ej: 0, 80, 160...) */
  delay?: number;
}

// Envuelve una sección y la anima (mismo fade+rise que .page-enter/.fade-in-up)
// recién cuando entra en el viewport, en vez de disparar todo apenas carga
// la página -sin esto, cualquier cosa debajo del pliegue ya estaba
// "animada" (visible al 100%) antes de que el usuario llegue a verla, la
// animación se pierde. threshold bajo + rootMargin negativo: dispara un
// poco antes de que el elemento esté totalmente a la vista, no justo en el
// borde.
export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // El chequeo de reduced-motion se hace acá, como inicializador de
  // useState (corre durante el render), no en el efecto -así no hace
  // falta un setState síncrono adentro del efecto para ese caso.
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const el = ref.current;
    // Si ya arrancó visible (reduced-motion), no hace falta observar nada.
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // una sola vez -no se vuelve a ocultar al scrollear para arriba
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
