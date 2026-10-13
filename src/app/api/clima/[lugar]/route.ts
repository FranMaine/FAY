import { NextResponse } from 'next/server';
import { LUGARES, lugarPorSlug } from '@/lib/lugares';
import { obtenerClimaActual } from '@/lib/viento';

// Una versión prerenderizada por lugar del catálogo (LUGARES), igual de
// cacheada que /api/clima. Con dynamicParams = false un lugar que no existe
// da 404 sin llegar a pegarle a las APIs externas -así nadie puede inflar
// la cantidad de consultas inventando slugs.
export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return LUGARES.map((l) => ({ lugar: l.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ lugar: string }> }) {
  const lugar = lugarPorSlug((await params).lugar);
  if (!lugar) return NextResponse.json({ error: 'Lugar no encontrado' }, { status: 404 });
  try {
    return NextResponse.json(await obtenerClimaActual(lugar));
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener el clima' }, { status: 502 });
  }
}
