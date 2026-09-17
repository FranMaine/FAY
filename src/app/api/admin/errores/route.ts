import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Lista los últimos errores registrados por handleApiError (ver
// src/lib/api-error.ts) -el "monitoreo de errores" casero del sitio,
// sin depender de un servicio externo.
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const errores = await prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200, // suficiente para ver qué está pasando sin traer la tabla entera
    });
    return NextResponse.json(errores);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/errores');
  }
}

// Borra un error puntual (?id=...) o todos (sin query param) -para
// limpiar la lista una vez que ya se revisaron/solucionaron.
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      await prisma.errorLog.delete({ where: { id } });
    } else {
      await prisma.errorLog.deleteMany({});
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/errores');
  }
}
