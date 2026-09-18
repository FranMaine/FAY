import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const clubes = await prisma.club.findMany({
      include: { _count: { select: { regatistas: true } } },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(
      clubes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        logoUrl: c.logoUrl,
        nombreCompleto: c.nombreCompleto,
        regatistasCount: c._count.regatistas,
      }))
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/clubes');
  }
}
