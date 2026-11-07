import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Mensajes de /contacto de la cuenta logueada, con la respuesta si ya la
// hay. `?resumen=1` devuelve solo cuántas respuestas todavía no vio (para
// el globito de la barra).
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (new URL(request.url).searchParams.get('resumen')) {
      const sinLeer = await prisma.mensajeContacto.count({
        where: { userId: session.user.id, respuesta: { not: null }, respuestaLeida: false },
      });
      return NextResponse.json({ sinLeer });
    }

    const mensajes = await prisma.mensajeContacto.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, asunto: true, mensaje: true, createdAt: true, respuesta: true, respondidoEn: true, respuestaLeida: true },
    });
    return NextResponse.json(mensajes);
  } catch (error) {
    return handleApiError(error, 'GET /api/mis-mensajes');
  }
}

// Marca como vistas todas las respuestas de la cuenta (al abrir la pantalla).
export async function PATCH() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await prisma.mensajeContacto.updateMany({
      where: { userId: session.user.id, respuestaLeida: false },
      data: { respuestaLeida: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/mis-mensajes');
  }
}
