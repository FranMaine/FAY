import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // `?resumen=1`: solo cuántas conversaciones tienen novedades sin leer
    // (mensaje nuevo o respuesta de la persona), para la campanita del admin.
    if (new URL(request.url).searchParams.get('resumen')) {
      const sinLeer = await prisma.mensajeContacto.count({ where: { leido: false } });
      return NextResponse.json({ sinLeer });
    }

    const mensajes = await prisma.mensajeContacto.findMany({
      orderBy: { ultimaActividad: 'desc' },
      take: 200,
      select: {
        id: true, nombre: true, email: true, asunto: true, mensaje: true, leido: true, createdAt: true,
        userId: true, estado: true, cerradoEn: true, ultimaActividad: true,
        entradas: { orderBy: { createdAt: 'asc' }, select: { id: true, autor: true, texto: true, createdAt: true } },
      },
    });
    return NextResponse.json(mensajes);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/mensajes');
  }
}
