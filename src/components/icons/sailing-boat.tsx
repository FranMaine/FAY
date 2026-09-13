import { Sailboat } from "lucide-react";
import type { LucideProps } from "lucide-react";

// El velero del logo, con el balanceo continuo de .boat-sway (ver
// globals.css) -se usa en la navbar y en todas las pantallas de auth en
// vez de <Sailboat> a secas, para que la animación quede consistente en
// todo el sitio sin repetir la clase en cada lugar.
export function SailingBoat({ className, ...props }: LucideProps) {
  return (
    <span className="boat-sway">
      <Sailboat className={className} {...props} />
    </span>
  );
}
