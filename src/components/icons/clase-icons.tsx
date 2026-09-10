// Logos de categoría para FAY Stats -los 10 archivos que subió el usuario
// (public/logos-categorias/*.png), ya procesados a fondo transparente y
// recoloreados a #3B82F6 por scripts/process-real-logos.ts a partir de los
// originales en logos/. No son dibujos nuestros: son los logos reales de
// cada clase/asociación, usados acá para identificar la categoría de cada
// campeonato -no para promocionar ni dar a entender afiliación con esas
// asociaciones.
import { ImgHTMLAttributes } from 'react';

export type ClaseIconSlug =
  | '29er' | '420' | 'f18' | 'ilca' | 'j24' | 'j70'
  | 'optimist' | 'raptor' | 'snipe' | 'star';

export const CLASE_ICONOS: Record<ClaseIconSlug, { label: string }> = {
  '29er': { label: '29er' },
  '420': { label: '420' },
  f18: { label: 'F18' },
  ilca: { label: 'ILCA' },
  j24: { label: 'J24' },
  j70: { label: 'J70' },
  optimist: { label: 'Optimist' },
  raptor: { label: 'RAPTOR' },
  snipe: { label: 'Snipe' },
  star: { label: 'Star' },
};

/**
 * Matchea el nombre de una Clase de la base (ej: "ILCA 6 (Laser Radial)",
 * "Optimist Principiantes") contra el slug de ícono que le corresponde.
 * Varias clases distintas de la base comparten un mismo ícono (las tres
 * ILCA, las tres variantes de Optimist) -por eso es un match por palabra
 * clave y no un mapeo 1 a 1 por id.
 */
export function slugDeClase(nombreClase: string): ClaseIconSlug | null {
  const n = nombreClase.toLowerCase();
  if (n.includes('29er')) return '29er';
  if (n.includes('420')) return '420';
  if (n.includes('f18')) return 'f18';
  if (n.includes('ilca') || n.includes('laser')) return 'ilca';
  if (n.includes('j24') || n.includes('j 24')) return 'j24';
  if (n.includes('j70') || n.includes('j 70')) return 'j70';
  if (n.includes('optimist')) return 'optimist';
  if (n.includes('raptor')) return 'raptor';
  if (n.includes('snipe')) return 'snipe';
  if (n.includes('star')) return 'star';
  return null;
}

interface ClaseIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  nombreClase: string;
}

export function ClaseIcon({ nombreClase, ...props }: ClaseIconProps) {
  const slug = slugDeClase(nombreClase);
  if (!slug) return null;
  // Son 10 archivos chicos (unos pocos KB), mostrados en tamaños distintos
  // según el lugar (badge de 16px, marquesina de 56px); next/image exige
  // width/height numéricos fijos por imagen, que chocaría con el sizing por
  // className que ya usa cada lugar donde se muestra.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/logos-categorias/${slug}.png`} alt={CLASE_ICONOS[slug].label} {...props} />
  );
}
