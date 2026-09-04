import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const resolvedParams = await params;
    const solicitudId = resolvedParams.id;
    const { action } = await request.json(); // 'APROBAR' o 'RECHAZAR'

    if (action !== 'APROBAR' && action !== 'RECHAZAR') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const solicitud = await prisma.solicitudVinculacion.findUnique({
      where: { id: solicitudId }
    });

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    if (action === 'APROBAR') {
      // Transaction to approve and link
      await prisma.$transaction([
        prisma.solicitudVinculacion.update({
          where: { id: solicitudId },
          data: { estado: 'APROBADA' }
        }),
        prisma.user.update({
          where: { id: solicitud.userId },
          data: { regatistaId: solicitud.regatistaId }
        }),
        // Reject all other pending requests for this same regatistaId
        prisma.solicitudVinculacion.updateMany({
          where: {
            regatistaId: solicitud.regatistaId,
            estado: 'PENDIENTE',
            id: { not: solicitudId }
          },
          data: { estado: 'RECHAZADA' }
        })
      ]);
    } else {
      await prisma.solicitudVinculacion.update({
        where: { id: solicitudId },
        data: { estado: 'RECHAZADA' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/solicitudes/[id]');
  }
}
