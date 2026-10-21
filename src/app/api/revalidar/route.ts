import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { refrescarRankings } from '@/lib/refrescar-cache';

// Limpia el caché de rankings, clubes y campeonatos desde afuera del sitio
// (ej: scripts/fusionar-duplicados.ts, que escribe directo en la base y por
// eso no pasa por las rutas del admin que ya lo limpian). Se protege con un
// token secreto (REVALIDAR_TOKEN) en el header Authorization: Bearer ...; sin
// el token configurado la ruta queda desactivada.
export async function POST(request: Request) {
  const esperado = process.env.REVALIDAR_TOKEN;
  if (!esperado) return NextResponse.json({ error: 'No disponible' }, { status: 404 });

  const recibido = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  refrescarRankings();
  return NextResponse.json({ ok: true });
}
