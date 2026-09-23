import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({ nombre: z.string().trim().min(2, 'Mínimo 2 caracteres') });

// Busca un club por nombre (insensible a mayúsculas) o lo crea si no
// existe, y devuelve su id -sin tocar ningún regatista. Pensado para
// resolver "¿existe ya este club, o hay que darlo de alta?" desde un
// formulario (ej: agregar un club secundario en RegatistaModal) sin
// reusar endpoints que además reasignan el club principal de alguien
// como efecto colateral.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { nombre } = bodySchema.parse(await request.json());
    const existente = await prisma.club.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
    const club = existente ?? (await prisma.club.create({ data: { nombre } }));

    return NextResponse.json({ id: club.id, nombre: club.nombre });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/clubes/resolver');
  }
}
