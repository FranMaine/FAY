import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { subirImagen, borrarImagen, ImagenInvalidaError } from '@/lib/upload-imagen';
import { puedeGestionarCampeonatos } from '@/lib/permisos';

// Mismo criterio que /api/admin/clubes/[id]/logo (ver ahí el porqué del
// timeout: quitarFondoLiso puede tardar unos segundos con fotos grandes).
export const maxDuration = 30;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !puedeGestionarCampeonatos(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const campeonato = await prisma.campeonato.findUnique({ where: { id } });
    if (!campeonato) {
      return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const logoUrl = await subirImagen(file, 'campeonatos', id, 400, 'inside');
    await prisma.campeonato.update({ where: { id }, data: { logoUrl } });
    if (campeonato.logoUrl) await borrarImagen(campeonato.logoUrl);

    return NextResponse.json({ logoUrl });
  } catch (error) {
    if (error instanceof ImagenInvalidaError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, 'PATCH /api/admin/campeonatos/[id]/logo');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !puedeGestionarCampeonatos(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const campeonato = await prisma.campeonato.findUnique({ where: { id } });
    if (!campeonato) {
      return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 });
    }

    if (campeonato.logoUrl) await borrarImagen(campeonato.logoUrl);
    await prisma.campeonato.update({ where: { id }, data: { logoUrl: null } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/campeonatos/[id]/logo');
  }
}
