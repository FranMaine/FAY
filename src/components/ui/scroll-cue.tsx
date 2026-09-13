"use client";

import { ChevronDown } from "lucide-react";

interface ScrollCueProps {
  /** id del elemento al que hay que scrollear */
  target: string;
  className?: string;
}

// Botón circular al pie del hero que invita a seguir bajando -sin esto no
// había ninguna señal de que la página siguiera más allá de los botones
// del hero, algo que en una sección tan alta (py-32) no es obvio a simple
// vista en pantallas chicas.
export function ScrollCue({ target, className }: ScrollCueProps) {
  return (
    <button
      type="button"
      aria-label="Ir a la siguiente sección"
      onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })}
      className={[
        "flex h-11 w-11 items-center justify-center rounded-full",
        "bg-surface/70 border border-border backdrop-blur-sm text-muted-foreground",
        "hover:text-primary hover:border-primary/50 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className || "",
      ].join(" ")}
    >
      <ChevronDown className="scroll-cue-icon h-5 w-5" />
    </button>
  );
}
