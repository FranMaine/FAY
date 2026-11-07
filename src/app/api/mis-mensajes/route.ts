import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Conversaciones de /contacto de la cuenta logueada (con su link de chat) y
// cuántas tienen una respuesta del admin sin ver. `?resumen=1` devuelve solo
// ese conteo, para el globito de la barra.
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (new URL(request.url).searchParams.get('resumen')) {
      const sinLeer = await prisma.mensajeContacto.count({
        where: { userId: session.user.id, respuestaLeida: false },
      });
      return NextResponse.json({ sinLeer });
    }

    const conversaciones = await prisma.mensajeContacto.findMany({
      where: { userId: session.user.id, token: { not: null } },
      orderBy: { ultimaActividad: 'desc' },
      take: 100,
      select: {
        id: true, token: true, asunto: true, mensaje: true, createdAt: true, estado: true, respuestaLeida: true, ultimaActividad: true,
        entradas: { orderBy: { createdAt: 'desc' }, take: 1, select: { autor: true, texto: true, createdAt: true } },
      },
    });
    return NextResponse.json(conversaciones);
  } catch (error) {
    return handleApiError(error, 'GET /api/mis-mensajes');
  }
}
