import { NextResponse } from 'next/server';

// Vercel define esta variable en cada build con el SHA del commit
// desplegado -sirve como "número de versión" sin tener que mantener uno a
// mano. En local (sin Vercel) queda undefined, y UpdateBanner directamente
// no hace nada en ese caso (ver su comentario).
export async function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
