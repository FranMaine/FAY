import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';

// Cuentas que hoy están vinculadas a una ficha de regatista -para poder
// desvincular una que no corresponde (ver DELETE en ./[userId]).
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const usuarios = await prisma.user.findMany({
      where: { regatistaId: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        regatista: { select: { id: true, nombre: true, club: { select: { nombre: true } } } },
      },
      orderBy: { email: 'asc' },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/vinculaciones');
  }
}
