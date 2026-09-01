import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const solicitudes = await prisma.solicitudVinculacion.findMany({
      where: { estado: 'PENDIENTE' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        regatista: { select: { nombre: true, club: { select: { nombre: true } } } }
      }
    });

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error('Error fetching solicitudes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
