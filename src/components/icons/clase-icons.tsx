// Set de "logos" de categoría para FAY Stats.
//
// Ojo: las imágenes que pasó el usuario para convertir eran, en su
// mayoría, las identidades oficiales de cada asociación de clase (el
// wordmark de ILCA, el logo registrado de J/Boats para J24/J70 -marcado
// con ®-, etc.) -son marcas registradas de terceros, así que en vez de
// reproducirlas pixel a pixel se diseñó acá un set de badges propios,
// originales, en un mismo estilo (círculo + texto o pictograma simple),
// todos en el celeste de marca del sitio (#3B82F6). Cubre las 10 familias
// visuales que hacían falta; ILCA y Optimist se reusan para sus variantes
// (ILCA 4/6/7, Optimist/Principiantes/Timoneles).
import { SVGProps } from 'react';

export type ClaseIconSlug =
  | '29er' | '420' | 'f18' | 'ilca' | 'j24' | 'j70'
  | 'optimist' | 'raptor' | 'snipe' | 'star';

interface IconProps extends SVGProps<SVGSVGElement> {
  /** Si es false, no dibuja el círculo del badge -solo el glifo (para usos chicos, en línea con texto). */
  badge?: boolean;
}

const AROS = { cx: 50, cy: 50, r: 45, strokeWidth: 5 };

function Badge({ children, badge = true, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {badge && <circle cx={AROS.cx} cy={AROS.cy} r={AROS.r} stroke="currentColor" strokeWidth={AROS.strokeWidth} />}
      {children}
    </svg>
  );
}

function Wordmark(texto: string, fontSize: number) {
  return (
    <text
      x="50"
      y="52"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Arial, Helvetica, sans-serif"
      fontWeight={800}
      fontSize={fontSize}
      fill="currentColor"
      letterSpacing="-1"
    >
      {texto}
    </text>
  );
}

export function Icono29er(props: IconProps) {
  return <Badge {...props}>{Wordmark('29ER', 26)}</Badge>;
}

export function Icono420(props: IconProps) {
  return <Badge {...props}>{Wordmark('420', 32)}</Badge>;
}

export function IconoF18(props: IconProps) {
  return <Badge {...props}>{Wordmark('F18', 32)}</Badge>;
}

export function IconoIlca(props: IconProps) {
  return <Badge {...props}>{Wordmark('ILCA', 24)}</Badge>;
}

export function IconoJ24(props: IconProps) {
  return <Badge {...props}>{Wordmark('J24', 30)}</Badge>;
}

export function IconoJ70(props: IconProps) {
  return <Badge {...props}>{Wordmark('J70', 30)}</Badge>;
}

// Mismo pictograma de velero que ya usa el resto del sitio (header, login,
// registro) -viene de lucide-react (paths del ícono "Sailboat"), reescalado
// acá para que el Optimist quede visualmente coherente con el resto de la
// marca en vez de inventar un dibujo de bote distinto.
export function IconoOptimist(props: IconProps) {
  return (
    <Badge {...props}>
      <g transform="translate(20,19) scale(2.5)" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v15" />
        <path d="M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z" />
        <path d="M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z" />
      </g>
    </Badge>
  );
}

export function IconoRaptor(props: IconProps) {
  return (
    <Badge {...props}>
      <g stroke="currentColor" strokeWidth={7} strokeLinecap="round">
        <line x1="32" y1="25" x2="45" y2="78" />
        <line x1="47" y1="22" x2="60" y2="78" />
        <line x1="62" y1="25" x2="75" y2="78" />
      </g>
    </Badge>
  );
}

export function IconoSnipe(props: IconProps) {
  return (
    <Badge {...props}>
      <path
        d="M16 58 Q33 36 50 50 Q67 36 84 58"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Badge>
  );
}

export function IconoStar(props: IconProps) {
  return (
    <Badge {...props}>
      <path
        d="M50,20 57.05,40.29 78.53,40.73 61.41,53.71 67.63,74.27 50,62 32.37,74.27 38.59,53.71 21.47,40.73 42.95,40.29Z"
        fill="currentColor"
      />
    </Badge>
  );
}

export const CLASE_ICONOS: Record<ClaseIconSlug, { componente: (props: IconProps) => React.ReactElement; label: string }> = {
  '29er': { componente: Icono29er, label: '29er' },
  '420': { componente: Icono420, label: '420' },
  f18: { componente: IconoF18, label: 'F18' },
  ilca: { componente: IconoIlca, label: 'ILCA' },
  j24: { componente: IconoJ24, label: 'J24' },
  j70: { componente: IconoJ70, label: 'J70' },
  optimist: { componente: IconoOptimist, label: 'Optimist' },
  raptor: { componente: IconoRaptor, label: 'RAPTOR' },
  snipe: { componente: IconoSnipe, label: 'Snipe' },
  star: { componente: IconoStar, label: 'Star' },
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

export function ClaseIcon({ nombreClase, ...props }: { nombreClase: string } & IconProps) {
  const slug = slugDeClase(nombreClase);
  if (!slug) return null;
  const Componente = CLASE_ICONOS[slug].componente;
  return <Componente {...props} />;
}
