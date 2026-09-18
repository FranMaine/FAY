import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { borrarImagen } from '@/lib/upload-imagen';
import { registrarAuditoria } from '@/lib/auditoria';

const bodySchema = z.object({
  nombre: z.string().trim().min(1, 'La abreviación no puede estar vacía').optional(),
  nombreCompleto: z.string().trim().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const club = await prisma.club.update({
      where: { id },
      data: {
        ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
        ...(body.nombreCompleto !== undefined ? { nombreCompleto: body.nombreCompleto || null } : {}),
      },
    });
    return NextResponse.json({ id: club.id, nombre: club.nombre, nombreCompleto: club.nombreCompleto });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/clubes/[id]');
  }
}

// Elimina el club: sus regatistas quedan sin club (no se borran) y las
// sedes de campeonato que apuntaban a él quedan sin sede.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });

    await prisma.$transaction([
      prisma.regatista.updateMany({ where: { clubId: id }, data: { clubId: null } }),
      prisma.campeonato.updateMany({ where: { sedeId: id }, data: { sedeId: null } }),
      prisma.club.delete({ where: { id } }),
    ]);

    if (club.logoUrl?.startsWith('http')) await borrarImagen(club.logoUrl);
    void registrarAuditoria(
      { email: session.user.email || session.user.id, name: session.user.name },
      'club.eliminar',
      'Club',
      id,
      { nombre: club.nombre }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/clubes/[id]');
  }
}
