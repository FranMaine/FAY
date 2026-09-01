import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { regatistaId } = await request.json();
    if (!regatistaId) {
      return NextResponse.json({ error: 'Falta regatistaId' }, { status: 400 });
    }

    // Check if the regatista is already linked to someone
    const existingLinkedUser = await prisma.user.findFirst({
      where: { regatistaId },
    });

    if (existingLinkedUser) {
      return NextResponse.json({ error: 'Este perfil ya fue reclamado por otro usuario.' }, { status: 400 });
    }

    // Check if user already has a pending or approved request
    const existingRequest = await prisma.solicitudVinculacion.findFirst({
      where: {
        userId: session.user.id,
        estado: { in: ['PENDIENTE', 'APROBADA'] }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Ya tienes una solicitud de vinculación activa o aprobada.' }, { status: 400 });
    }

    // Create the request
    const solicitud = await prisma.solicitudVinculacion.create({
      data: {
        userId: session.user.id,
        regatistaId,
        estado: 'PENDIENTE'
      }
    });

    return NextResponse.json(solicitud);
  } catch (error) {
    console.error('Error linking regatista:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const solicitud = await prisma.solicitudVinculacion.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        regatista: { select: { nombre: true, club: { select: { nombre: true } } } }
      }
    });

    return NextResponse.json(solicitud || null);
  } catch (error) {
    console.error('Error fetching solicitud:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
