import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z
  .object({ leido: z.boolean().optional(), estado: z.enum(['ABIERTO', 'CERRADO']).optional() })
  .refine((b) => b.leido !== undefined || b.estado !== undefined, 'Nada para cambiar');

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { leido, estado } = bodySchema.parse(await request.json());
    // Cerrar el chat lo termina a mano (la persona ya no puede seguir
    // escribiendo); reabrirlo vuelve a habilitarlo.
    const mensaje = await prisma.mensajeContacto.update({
      where: { id },
      data: {
        ...(leido !== undefined ? { leido } : {}),
        ...(estado !== undefined ? { estado, cerradoEn: estado === 'CERRADO' ? new Date() : null, ultimaActividad: new Date() } : {}),
      },
      select: { id: true, leido: true, estado: true, cerradoEn: true, ultimaActividad: true },
    });
    return NextResponse.json(mensaje);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/mensajes/[id]');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.mensajeContacto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/mensajes/[id]');
  }
}
