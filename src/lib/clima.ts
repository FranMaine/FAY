// Códigos WMO que devuelve Open-Meteo, agrupados en pocas categorías visuales.
export type CategoriaClima = 'despejado' | 'nublado' | 'niebla' | 'llovizna' | 'lluvia' | 'nieve' | 'tormenta';

export function categoriaClima(codigo: number): CategoriaClima {
  if (codigo === 0 || codigo === 1) return 'despejado';
  if (codigo === 2 || codigo === 3) return 'nublado';
  if (codigo === 45 || codigo === 48) return 'niebla';
  if (codigo >= 51 && codigo <= 57) return 'llovizna';
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'lluvia';
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'nieve';
  if (codigo >= 95) return 'tormenta';
  return 'nublado';
}

export const ETIQUETA_CLIMA: Record<CategoriaClima, string> = {
  despejado: 'Despejado',
  nublado: 'Nublado',
  niebla: 'Niebla',
  llovizna: 'Llovizna',
  lluvia: 'Lluvia',
  nieve: 'Nieve',
  tormenta: 'Tormenta',
};

const PUNTOS_CARDINALES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

export function direccionViento(grados: number): string {
  const indice = Math.round((((grados % 360) + 360) % 360) / 22.5) % 16;
  return PUNTOS_CARDINALES[indice];
}

export interface ReporteMetar {
  reportTime: string;
  wspd?: number;
  wdir?: number | string; // METAR reporta "VRB" cuando el viento es variable
}

// Open-Meteo (la fuente de temperatura/ícono) es un modelo de pronóstico,
// no una medición real -por eso el viento no coincidía con lo que se ve en
// la zona. El aeródromo de San Fernando (SADF, a ~12km de San Isidro)
// publica METAR/SPECI con el viento REAL medido cada vez que cambia, igual
// que usan apps como "Qué Viento" con sus propias estaciones -y es gratis
// y público (aviationweather.gov, sin API key). Esta función extrae el
// viento del reporte más reciente, o null si no hay uno reciente (la
// estación puede no reportar por un rato) para poder caer de nuevo a
// Open-Meteo.
const ANTIGUEDAD_MAXIMA_METAR_MIN = 90;

export function vientoDesdeMetar(
  reportes: ReporteMetar[] | null | undefined,
  ahora: Date = new Date()
): { vientoNudos: number; vientoGrados: number } | null {
  const reporte = reportes?.[0];
  if (!reporte || typeof reporte.wspd !== "number" || typeof reporte.wdir !== "number") return null;

  const antiguedadMin = (ahora.getTime() - new Date(reporte.reportTime).getTime()) / 60000;
  if (!Number.isFinite(antiguedadMin) || antiguedadMin < 0 || antiguedadMin > ANTIGUEDAD_MAXIMA_METAR_MIN) return null;

  return { vientoNudos: Math.round(reporte.wspd), vientoGrados: reporte.wdir };
}
