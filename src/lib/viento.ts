import { vientoDesdeMetar, type ReporteMetar } from '@/lib/clima';
import type { Lugar } from '@/lib/lugares';

// Datos de viento por lugar, para la página /viento y /api/clima. Solo se
// usa desde el servidor: pide a APIs externas y cachea 10 minutos (los
// reportes de las estaciones salen cada 30-60 min, no tiene sentido
// pedirlos más seguido).
export interface LecturaViento {
  hora: Date;
  nudos: number;
  /** Ráfaga máxima del período, si se informó. */
  rafaga: number | null;
  /** De dónde sopla, en grados (0 = norte). null si el viento era variable. */
  grados: number | null;
}

const REVALIDAR_S = 10 * 60;
const TRES_HORAS_MS = 3 * 60 * 60 * 1000;

/**
 * true si la última lectura es de hace más de 3 horas (la estación dejó de
 * reportar). La página se genera cada 10 minutos, así que "ahora" es el
 * momento de esa generación -suficiente para este aviso. `ahora` es
 * inyectable para poder probarlo.
 */
export function estaDesactualizada(lectura: LecturaViento | null, ahora: number = Date.now()): boolean {
  return lectura !== null && ahora - lectura.hora.getTime() > TRES_HORAS_MS;
}

interface ReporteMetarCompleto {
  obsTime: number;
  wspd?: number;
  wgst?: number | null;
  wdir?: number | string;
}

/**
 * Mediciones reales de la estación del lugar en las últimas 24 h, de más
 * vieja a más nueva. Vacío si el lugar no tiene estación cerca o si la
 * fuente no responde.
 */
export async function obtenerHistorialMedido(lugar: Lugar): Promise<LecturaViento[]> {
  if (!lugar.estacion) return [];
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${lugar.estacion.id}&format=json&hours=24`;
    const res = await fetch(url, { next: { revalidate: REVALIDAR_S } });
    if (!res.ok) return [];
    const reportes = (await res.json()) as ReporteMetarCompleto[];
    return reportes
      .filter((r) => typeof r.wspd === 'number')
      .map((r) => ({
        hora: new Date(r.obsTime * 1000),
        nudos: r.wspd as number,
        rafaga: typeof r.wgst === 'number' ? r.wgst : null,
        grados: typeof r.wdir === 'number' ? r.wdir : null,
      }))
      .sort((a, b) => a.hora.getTime() - b.hora.getTime());
  } catch {
    return [];
  }
}

/** Pronóstico horario (modelo) de las próximas 24 h en el lugar. */
export async function obtenerPronostico(lugar: Lugar): Promise<LecturaViento[]> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lugar.latitud));
    url.searchParams.set('longitude', String(lugar.longitud));
    url.searchParams.set('hourly', 'wind_speed_10m,wind_gusts_10m,wind_direction_10m');
    url.searchParams.set('wind_speed_unit', 'kn');
    url.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');
    url.searchParams.set('timeformat', 'unixtime');
    url.searchParams.set('forecast_hours', '24');

    const res = await fetch(url, { next: { revalidate: REVALIDAR_S } });
    if (!res.ok) return [];
    const { hourly } = (await res.json()) as {
      hourly: { time: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[]; wind_direction_10m: number[] };
    };
    return hourly.time.map((t, i) => ({
      hora: new Date(t * 1000),
      nudos: hourly.wind_speed_10m[i],
      rafaga: hourly.wind_gusts_10m[i],
      grados: hourly.wind_direction_10m[i],
    }));
  } catch {
    return [];
  }
}

export interface ClimaActual {
  lugar: { slug: string; nombre: string };
  temperatura: number;
  codigoClima: number;
  vientoNudos: number;
  vientoGrados: number;
  /** true si el viento es una medición de la estación; false si es la estimación del modelo. */
  vientoMedido: boolean;
  actualizado: string;
}

/**
 * Lo que muestra el badge del navbar: temperatura e ícono del cielo
 * (Open-Meteo, un modelo de pronóstico) y el viento -REAL, de la estación
 * del lugar, cuando hay un reporte reciente; si no, el del modelo.
 * Lanza error si Open-Meteo no responde (el badge simplemente no se muestra).
 */
export async function obtenerClimaActual(lugar: Lugar): Promise<ClimaActual> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lugar.latitud));
  url.searchParams.set('longitude', String(lugar.longitud));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
  url.searchParams.set('wind_speed_unit', 'kn');
  url.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');

  const [resOpenMeteo, vientoReal] = await Promise.all([
    fetch(url, { next: { revalidate: REVALIDAR_S } }),
    obtenerVientoReal(lugar),
  ]);
  if (!resOpenMeteo.ok) throw new Error(`Open-Meteo respondió ${resOpenMeteo.status}`);
  const { current } = await resOpenMeteo.json();

  return {
    lugar: { slug: lugar.slug, nombre: lugar.nombre },
    temperatura: Math.round(current.temperature_2m),
    codigoClima: current.weather_code,
    vientoNudos: vientoReal?.vientoNudos ?? Math.round(current.wind_speed_10m),
    vientoGrados: vientoReal?.vientoGrados ?? current.wind_direction_10m,
    vientoMedido: vientoReal !== null,
    actualizado: current.time,
  };
}

async function obtenerVientoReal(lugar: Lugar): Promise<{ vientoNudos: number; vientoGrados: number } | null> {
  if (!lugar.estacion) return null;
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${lugar.estacion.id}&format=json&hours=2`;
    const res = await fetch(url, { next: { revalidate: REVALIDAR_S } });
    if (!res.ok) return null;
    return vientoDesdeMetar((await res.json()) as ReporteMetar[]);
  } catch {
    return null;
  }
}
