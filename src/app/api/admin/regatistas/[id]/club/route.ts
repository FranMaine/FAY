import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({ clubId: z.string().nullable() });

// Reasigna el club de UN regatista puntual -pensado para resolver a mano
// los clubes "combo" (ver /admin/clubes): un regatista que hoy tiene
// clubId apuntando a "CNO / CNMP / CRLP" pasa a apuntar al club real que
// le corresponde (o a ninguno), sin tocar al resto de los regatistas que
// comparten esa misma ficha combo.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { clubId } = bodySchema.parse(await request.json());

    if (clubId) {
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    await prisma.regatista.update({ where: { id }, data: { clubId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/regatistas/[id]/club');
  }
}
