import Image from 'next/image';
import { CLASE_ICONOS, SLUGS_MARQUESINA } from '@/components/icons/clase-icons';

// Franja de logos de categoría con scroll automático infinito. Se duplica
// la lista de ítems una vez y se anima el contenedor -50% de su ancho: al
// llegar a la mitad, lo que se ve es visualmente idéntico al arranque, así
// que el loop no se nota (el salto ocurre "detrás" del duplicado).
export function ClaseMarquee() {
  const items = SLUGS_MARQUESINA.map((slug) => [slug, CLASE_ICONOS[slug]] as const);
  const doble = [...items, ...items];

  return (
    <div className="relative overflow-hidden py-10 border-y border-border bg-surface/30 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      {/* No se frena al pasar el mouse: la franja sigue corriendo siempre. Con
          "reducir movimiento" activado en el sistema queda quieta (ver
          .marquee-track en globals.css). */}
      <div className="marquee-track flex w-max animate-[marquee_28s_linear_infinite]">
        {doble.map(([slug, { label }], i) => (
          <div key={`${slug}-${i}`} aria-hidden={i >= items.length || undefined} className="flex flex-col items-center gap-2 px-8 shrink-0 w-28">
            {/* Caja fija de 56 px para que todas las etiquetas queden alineadas; el
                logo de Grumete es cuadrado y ocupa todo el cuadro (los otros son
                más anchos que altos), así que se dibuja más chico para que pese
                igual que el resto. */}
            <div className="flex h-14 w-14 items-center justify-center">
              <Image
                src={`/logos-categorias/${slug}.png`}
                alt={label}
                width={56}
                height={56}
                className={slug === 'grumete' ? 'h-10 w-10 object-contain' : 'h-14 w-14 object-contain'}
              />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
