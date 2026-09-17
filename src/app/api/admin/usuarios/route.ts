import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Busca usuarios por email/nombre -pensado para que un admin encuentre a
// la persona que va a organizar una regata (encargada de club) y la
// promueva a administrador. Sin query, no devuelve nada: no tiene
// sentido listar TODOS los usuarios de entrada en un sitio con
// potencialmente miles de cuentas.
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const q = new URL(request.url).searchParams.get('q')?.trim();
    if (!q || q.length < 2) return NextResponse.json([]);

    const usuarios = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true, role: true },
      take: 10,
      orderBy: { email: 'asc' },
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/usuarios');
  }
}
