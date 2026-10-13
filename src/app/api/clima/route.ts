import { NextResponse } from 'next/server';
import { LUGAR_PREDETERMINADO } from '@/lib/lugares';
import { obtenerClimaActual } from '@/lib/viento';

// Clima del lugar predeterminado (San Isidro). Para el de cada lugar ver
// /api/clima/[lugar]. Cacheado 10 min en el CDN.
export const revalidate = 600;

export async function GET() {
  try {
    return NextResponse.json(await obtenerClimaActual(LUGAR_PREDETERMINADO));
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener el clima' }, { status: 502 });
  }
}
