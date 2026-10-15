import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Lista las cuentas (con rol) para la pantalla "Usuarios y roles". Sin
// query devuelve todas hasta LIMITE_LISTA -la pantalla las muestra siempre,
// completas, y filtra en el cliente al escribir-; con query busca por
// email/nombre (se usa cuando hay más cuentas que el límite y la lista
// completa no entra). Admin y Organizador salen primero: son los que
// importa tener a la vista.
const LIMITE_LISTA = 500;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const q = new URL(request.url).searchParams.get('q')?.trim();

    const usuarios = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: { id: true, email: true, name: true, role: true },
      take: LIMITE_LISTA,
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/usuarios');
  }
}
