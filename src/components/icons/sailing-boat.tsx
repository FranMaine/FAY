import { Sailboat } from "lucide-react";
import type { LucideProps } from "lucide-react";

// El velero del logo: el casco se balancea (.boat-sway) con una línea de
// agua debajo (.water-ripple) que fluye a su propio ritmo -sin eso el bote
// parecía flotar en el aire, moviéndose solo mientras nada a su alrededor
// quedaba quieto.
//
// Importante: .boat-sway va SOLO en el wrapper del ícono, no en el
// contenedor que envuelve a los dos (bote + agua). El agua es un hijo
// posicionado "absolute", así que si hereda la rotación/traslación del
// balanceo, se mueve pegada al casco como si fuera parte rígida del mismo
// dibujo -se ve como un logo entero rotando en bloque, no como un bote
// meciéndose SOBRE el agua. Separándolos, el agua queda a nivel y es el
// casco el único que pivotea (bottom center: como apoyado en la línea de
// flotación).
//
// El agua es absolute dentro del wrapper exterior (no suma alto al
// layout), así encaja igual de bien en la navbar (ícono chico, fila de
// 64px) que en el círculo del hero -el mismo motivo por el que no se
// dibuja como una ola aparte más abajo del ícono. Dos trazos (uno más
// tenue detrás) en vez de uno solo le dan una sensación de profundidad en
// vez de una única línea plana.
export function SailingBoat({ className, ...props }: LucideProps) {
  return (
    <span className="relative inline-block">
      <span className="block boat-sway">
        <Sailboat className={className} {...props} />
      </span>
      <svg
        className="water-ripple absolute left-[6%] right-[6%] bottom-[4%] h-[22%] text-primary/70"
        viewBox="0 0 40 8"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="water-ripple-back"
          d="M0,5 Q2.5,3 5,5 T10,5 T15,5 T20,5 T25,5 T30,5 T35,5 T40,5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.45"
        />
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
