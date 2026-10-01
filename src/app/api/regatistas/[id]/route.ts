import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { regatistaEditSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { eliminarClubesVacios } from '@/lib/club-cleanup';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = regatistaEditSchema.parse(json);

    let clubId: string | null | undefined = undefined;
    if (body.club !== undefined) {
      const clubStr = body.club.trim().toUpperCase();
      if (!clubStr) {
        clubId = null;
      } else {
        const club = await prisma.club.upsert({
          where: { nombre: clubStr },
          update: {},
          create: { nombre: clubStr },
        });
        clubId = club.id;
      }
    }

    // Club de ANTES de tocar nada -si el cambio lo deja sin nadie, se
    // borra solo (ver eliminarClubesVacios).
    const clubAntes = clubId !== undefined
      ? (await prisma.regatista.findUnique({ where: { id }, select: { clubId: true } }))?.clubId
      : undefined;

    const regatista = await prisma.regatista.update({
      where: { id },
      data: {
        nombre: body.nombre,
        pais: body.pais,
        ...(clubId !== undefined ? { clubId } : {}),
      },
      include: { club: true },
    });

    if (clubAntes) {
      await eliminarClubesVacios([clubAntes], { email: session.user.email || session.user.id, name: session.user.name });
    }

    return NextResponse.json(regatista);
  } catch (error) {
    return handleApiError(error, 'PUT /api/regatistas/[id]');
  }
}
