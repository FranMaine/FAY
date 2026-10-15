import type { LucideProps } from "lucide-react";
import { VELERO_TRAZADOS, VELERO_VIEWBOX } from "./sailing-boat-paths";

// Marca del velero, vectorizada a partir del logo que mandó el usuario
// (silueta sólida: mayor + foque + casco + estela, un solo color). Estático
// en todo el sitio, sin balanceo ni agua animada por separado -eso lo tenía
// la versión anterior porque el ícono de lucide-react no traía nada de eso
// dibujado; este ya incluye su propia estela como parte del trazo.
//
// El viewBox NO es el 0..500 / 0..457 completo que dejó el trazado
// automático -el dibujo real ocupa solo un recuadro de 220x254 ahí adentro
// (getBBox() en el navegador lo confirmó), así que con el viewBox completo
// el velero se veía chico y perdido en el medio de su propio ícono. Acá va
// recortado a ese recuadro real (+ un margen chico) para que llene el
// cuadrado igual que hacía el ícono anterior.
export function SailingBoat({ className, ...props }: LucideProps) {
  return (
    <svg viewBox={VELERO_VIEWBOX} fill="none" className={className} {...props}>
      {VELERO_TRAZADOS.map((t) => (
        <path key={t.transform} d={t.d} fill="currentColor" transform={t.transform} />
      ))}
    </svg>
  );
}
