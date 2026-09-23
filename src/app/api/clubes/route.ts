import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Listado liviano de clubes (id + nombre), público -lo usan selects como
// "Sede" del campeonato. A diferencia de /api/admin/clubes, no requiere
// ADMIN: un ORGANIZADOR también tiene que poder elegir una sede al crear
// o editar un campeonato, y es información igual de pública que /clubes.
export async function GET() {
  try {
    const clubes = await prisma.club.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(clubes);
  } catch (error) {
    return handleApiError(error, 'GET /api/clubes');
  }
}
