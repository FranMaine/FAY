"use client";

import { useEffect, useState } from "react";
import { ArrowUpIcon } from "lucide-react";

// Aparece recién después de scrollear un poco -no tiene sentido mostrarlo
// arriba de todo, donde no hay a dónde "volver". El listener de scroll usa
// un throttle simple con requestAnimationFrame en vez de disparar en cada
// evento (el scroll dispara decenas de eventos por segundo).
const UMBRAL_PX = 400;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > UMBRAL_PX);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
      className={[
        "fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full",
        "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover",
        "transition-[opacity,transform] duration-200 ease-out active:scale-90",
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
    >
      <ArrowUpIcon className="h-5 w-5" />
    </button>
  );
}
