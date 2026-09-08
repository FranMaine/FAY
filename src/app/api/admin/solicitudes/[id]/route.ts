import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { sendEmail, emailVinculacionAprobada } from '@/lib/email';

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
      const [, usuarioActualizado, , regatista] = await prisma.$transaction([
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
        }),
        prisma.regatista.findUnique({ where: { id: solicitud.regatistaId } })
      ]);

      // Notificación por mail de que la cuenta quedó verificada -no
      // bloqueamos la respuesta si el envío falla, la vinculación ya
      // quedó confirmada en la base.
      if (usuarioActualizado.email && regatista) {
        void sendEmail({
          to: usuarioActualizado.email,
          ...emailVinculacionAprobada(regatista.nombre),
        });
      }
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
