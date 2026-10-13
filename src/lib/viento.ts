import { SAN_ISIDRO, ESTACION_METAR } from '@/lib/clima';

// Datos de la página /viento. Solo se usa desde Server Components: pide a
// APIs externas y cachea 10 minutos (los reportes de la estación salen cada
// 30-60 min, no tiene sentido pedirlos más seguido).
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

/** Mediciones reales de la estación en las últimas 24 h, de más vieja a más nueva. */
export async function obtenerHistorialMedido(): Promise<LecturaViento[]> {
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${ESTACION_METAR}&format=json&hours=24`;
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

/** Pronóstico horario (modelo) de las próximas 24 h en San Isidro. */
export async function obtenerPronostico(): Promise<LecturaViento[]> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(SAN_ISIDRO.latitud));
    url.searchParams.set('longitude', String(SAN_ISIDRO.longitud));
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
