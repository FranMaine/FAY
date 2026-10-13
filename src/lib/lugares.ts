// Lugares para los que Orzando muestra el viento. Cada club pertenece a uno
// (ver LUGAR_DE_CLUB): al entrar con tu cuenta, el viento del navbar y la
// página /viento arrancan en el lugar de TU club en vez de siempre en San
// Isidro. Es pura data -sin imports de servidor- así la usan tanto el
// navbar (cliente) como las páginas y APIs (servidor).

export interface EstacionMetar {
  /** Código ICAO de la estación de aeródromo (ej: SADF). */
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

export interface Lugar {
  slug: string;
  nombre: string;
  latitud: number;
  longitud: number;
  /**
   * Estación cercana (≤ ~20 km) que informa el viento REAL medido. null si no
   * hay ninguna lo bastante cerca -ahí se muestra solo el pronóstico del
   * modelo, marcado como estimado, en vez de una medición de una estación
   * que queda en otro valle o a 60 km.
   */
  estacion: EstacionMetar | null;
}

const SADF: EstacionMetar = { id: 'SADF', nombre: 'San Fernando', latitud: -34.457, longitud: -58.593 };
const SABE: EstacionMetar = { id: 'SABE', nombre: 'Aeroparque', latitud: -34.559, longitud: -58.416 };

// Estaciones verificadas contra aviationweather.gov (todas con lecturas en
// las últimas horas al momento de armar esta lista). La primera es el lugar
// predeterminado.
export const LUGARES: readonly Lugar[] = [
  { slug: 'san-isidro', nombre: 'San Isidro y Zona Norte', latitud: -34.4508, longitud: -58.4528, estacion: SADF },
  { slug: 'buenos-aires', nombre: 'Buenos Aires (Costanera)', latitud: -34.55, longitud: -58.44, estacion: SABE },
  { slug: 'cordoba', nombre: 'Córdoba', latitud: -31.4201, longitud: -64.1888, estacion: { id: 'SACO', nombre: 'Córdoba (Taravella)', latitud: -31.324, longitud: -64.208 } },
  { slug: 'corrientes', nombre: 'Corrientes', latitud: -27.4692, longitud: -58.8306, estacion: { id: 'SARC', nombre: 'Corrientes', latitud: -27.445, longitud: -58.762 } },
  { slug: 'la-plata', nombre: 'La Plata', latitud: -34.9205, longitud: -57.9536, estacion: null },
  { slug: 'mar-del-plata', nombre: 'Mar del Plata', latitud: -38.0055, longitud: -57.5426, estacion: { id: 'SAZM', nombre: 'Mar del Plata', latitud: -37.932, longitud: -57.581 } },
  { slug: 'montevideo', nombre: 'Montevideo', latitud: -34.9011, longitud: -56.1645, estacion: { id: 'SUMU', nombre: 'Carrasco', latitud: -34.838, longitud: -56.031 } },
  { slug: 'parana', nombre: 'Paraná', latitud: -31.7333, longitud: -60.5333, estacion: null },
  { slug: 'punta-del-este', nombre: 'Punta del Este', latitud: -34.9667, longitud: -54.95, estacion: { id: 'SULS', nombre: 'Maldonado (Laguna del Sauce)', latitud: -34.855, longitud: -55.094 } },
  { slug: 'rosario', nombre: 'Rosario', latitud: -32.9468, longitud: -60.6393, estacion: { id: 'SAAR', nombre: 'Rosario', latitud: -32.918, longitud: -60.782 } },
  { slug: 'san-nicolas', nombre: 'San Nicolás', latitud: -33.3333, longitud: -60.2167, estacion: null },
  { slug: 'san-pedro', nombre: 'San Pedro', latitud: -33.6786, longitud: -59.6667, estacion: null },
  { slug: 'villa-la-angostura', nombre: 'Villa La Angostura', latitud: -40.7633, longitud: -71.6439, estacion: null },
  { slug: 'zarate', nombre: 'Zárate', latitud: -34.0981, longitud: -59.0286, estacion: null },
];

export const LUGAR_PREDETERMINADO = LUGARES[0];

// Sigla del club (Club.nombre, en mayúsculas, tal como se guarda) -> lugar.
// Solo los clubes cuya ubicación se pudo confirmar (por su nombre completo
// o por el calendario oficial de la FAY); el resto, incluidos los del
// exterior, queda sin lugar y usa el predeterminado. Los clubes que no
// están acá no rompen nada: se suman cuando se confirma dónde están.
const CLUBES_POR_LUGAR: Record<string, string[]> = {
  'san-isidro': ['CNO', 'CNSI', 'CVB', 'YCO', 'CPNLB', 'BARRANCAS', 'CVSI', 'CNAS', 'CLUB NÁUTICO ALBATROS', 'CNSE', 'YCCN'],
  // Quilmes queda a ~25 km de la estación (la misma costa del río).
  'buenos-aires': ['YCA', 'CUBA', 'CGLNM', 'CNSA', 'CNQ'],
  'cordoba': ['CNC', '400YCC'],
  'corrientes': ['YCC'],
  'la-plata': ['CRLP'],
  'mar-del-plata': ['CNMP'],
  'montevideo': ['YCU'],
  'parana': ['CNP'],
  'punta-del-este': ['YCPE'],
  'rosario': ['YCR', 'CVR', 'RRC', 'CRR'],
  'san-nicolas': ['CRSN'],
  'san-pedro': ['CNSP'],
  'villa-la-angostura': ['CAVLA'],
  'zarate': ['CNZ'],
};

export const LUGAR_DE_CLUB: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(CLUBES_POR_LUGAR).flatMap(([slug, clubes]) => clubes.map((club) => [club, slug]))
);

export function lugarPorSlug(slug: string): Lugar | null {
  return LUGARES.find((l) => l.slug === slug) ?? null;
}

/** El lugar del club con esa sigla; si no se sabe (o no hay club), el predeterminado. */
export function lugarDeClub(nombreClub: string | null | undefined): Lugar {
  if (!nombreClub) return LUGAR_PREDETERMINADO;
  const slug = LUGAR_DE_CLUB[nombreClub.trim().toUpperCase()];
  return (slug && lugarPorSlug(slug)) || LUGAR_PREDETERMINADO;
}

/** Ruta de la página de viento de un lugar (el predeterminado vive en /viento). */
export function urlViento(slug: string): string {
  return slug === LUGAR_PREDETERMINADO.slug ? '/viento' : `/viento/${slug}`;
}

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
