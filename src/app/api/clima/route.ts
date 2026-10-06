import { NextResponse } from 'next/server';

// Coordenadas de San Isidro (ver el pedido del sitio). Open-Meteo no pide
// API key y devuelve viento y temperatura en tiempo real.
const LATITUD = -34.4508;
const LONGITUD = -58.4528;

export const revalidate = 600;

export async function GET() {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(LATITUD));
    url.searchParams.set('longitude', String(LONGITUD));
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
    url.searchParams.set('wind_speed_unit', 'kmh');
    url.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
    const data = await res.json();
    const actual = data.current;

    return NextResponse.json({
      temperatura: Math.round(actual.temperature_2m),
      codigoClima: actual.weather_code,
      vientoKmh: Math.round(actual.wind_speed_10m),
      vientoGrados: actual.wind_direction_10m,
      actualizado: actual.time,
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener el clima' }, { status: 502 });
  }
}
