import { NextResponse } from 'next/server';
import { vientoDesdeMetar, type ReporteMetar } from '@/lib/clima';

// Coordenadas de San Isidro (ver el pedido del sitio). Open-Meteo no pide
// API key y devuelve temperatura/ícono del cielo -pero es un modelo de
// pronóstico, no una medición real, así que el viento no era preciso.
const LATITUD = -34.4508;
const LONGITUD = -58.4528;

// San Fernando (SADF): aeródromo a ~12km de San Isidro, sobre la misma
// costa del Río de la Plata. Publica METAR/SPECI con el viento REAL
// medido en la zona -gratis y sin API key (aviationweather.gov, del
// gobierno de EE.UU., cubre estaciones de todo el mundo). Mismo principio
// que usan apps como "Qué Viento" (estaciones propias): medición real en
// vez de un modelo.
const ESTACION_METAR = 'SADF';

export const revalidate = 600;

async function obtenerVientoReal(): Promise<{ vientoNudos: number; vientoGrados: number } | null> {
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${ESTACION_METAR}&format=json&hours=2`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const reportes: ReporteMetar[] = await res.json();
    return vientoDesdeMetar(reportes);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(LATITUD));
    url.searchParams.set('longitude', String(LONGITUD));
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
    url.searchParams.set('wind_speed_unit', 'kn');
    url.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');

    const [resOpenMeteo, vientoReal] = await Promise.all([
      fetch(url, { next: { revalidate: 600 } }),
      obtenerVientoReal(),
    ]);
    if (!resOpenMeteo.ok) throw new Error(`Open-Meteo respondió ${resOpenMeteo.status}`);
    const data = await resOpenMeteo.json();
    const actual = data.current;

    return NextResponse.json({
      temperatura: Math.round(actual.temperature_2m),
      codigoClima: actual.weather_code,
      vientoNudos: vientoReal?.vientoNudos ?? Math.round(actual.wind_speed_10m),
      vientoGrados: vientoReal?.vientoGrados ?? actual.wind_direction_10m,
      vientoMedido: vientoReal !== null,
      actualizado: actual.time,
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener el clima' }, { status: 502 });
  }
}
