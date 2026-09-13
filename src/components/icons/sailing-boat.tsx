import { Sailboat } from "lucide-react";
import type { LucideProps } from "lucide-react";

// El velero del logo: se balancea (.boat-sway) con una línea de agua debajo
// (.water-ripple) que fluye para abajo del casco -sin eso el bote parecía
// flotar en el aire, moviéndose solo mientras nada a su alrededor quedaba
// quieto. El agua es absolute dentro del wrapper (no suma alto al layout),
// así encaja igual de bien en la navbar (ícono chico, fila de 64px) que en
// el círculo del hero -el mismo motivo por el que no se dibuja como una ola
// aparte más abajo del ícono.
export function SailingBoat({ className, ...props }: LucideProps) {
  return (
    <span className="relative inline-block boat-sway">
      <Sailboat className={className} {...props} />
      <svg
        className="water-ripple absolute left-[8%] right-[8%] bottom-[6%] h-[18%] text-primary/70"
        viewBox="0 0 40 6"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,3 Q2.5,1 5,3 T10,3 T15,3 T20,3 T25,3 T30,3 T35,3 T40,3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
