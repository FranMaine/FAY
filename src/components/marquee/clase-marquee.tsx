import { CLASE_ICONOS } from '@/components/icons/clase-icons';

// Franja de logos de categoría con scroll automático infinito. Se duplica
// la lista de ítems una vez y se anima el contenedor -50% de su ancho: al
// llegar a la mitad, lo que se ve es visualmente idéntico al arranque, así
// que el loop no se nota (el salto ocurre "detrás" del duplicado).
export function ClaseMarquee() {
  const items = Object.entries(CLASE_ICONOS);
  const doble = [...items, ...items];

  return (
    <div className="relative overflow-hidden py-10 border-y border-border bg-surface/30 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] hover:[animation-play-state:paused]">
        {doble.map(([slug, { componente: Icono, label }], i) => (
          <div key={`${slug}-${i}`} className="flex flex-col items-center gap-2 px-8 shrink-0 w-28">
            <Icono className="w-14 h-14 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
