"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fay-theme";

interface ThemeToggleProps {
  className?: string;
}

// Botón de sol/luna: el ícono que se ve es al que se pasaría si lo
// tocás -en oscuro se ve un solcito (tocar = pasar a claro/día), en claro
// una luna (tocar = pasar a oscuro/noche).
//
// El estado arranca en "claro" y recién se corrige a lo que diga el
// <html> real (ya lo dejó puesto el script bloqueante de layout.tsx,
// antes del primer paint) adentro de un efecto, después del montaje -NO
// leyéndolo directo en un lazy initializer de useState durante el
// render. Probado y descartado: leerlo ahí funciona en teoría (el
// cliente ya tiene el valor real en ese momento) pero en la práctica la
// hidratación de React no siempre lo toma -el botón podía quedar
// mostrando el ícono de "claro" aunque el sitio estuviera en oscuro,
// hasta el próximo toggle manual. El efecto (con "mounted" ocultando el
// botón el primer frame, para no mostrar el ícono equivocado ni un
// instante) es el patrón que sí anda siempre.
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage puede fallar (modo privado, cuota llena, etc.) -el
      // toggle visual igual funciona para esta visita, simplemente no
      // persiste para la próxima.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground active:scale-90",
        !mounted && "invisible",
        className
      )}
    >
      <Sun
        className={cn(
          "absolute h-5 w-5 transition-[opacity,transform] duration-300 ease-out",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        )}
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-[opacity,transform] duration-300 ease-out",
          isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
    </button>
  );
}
