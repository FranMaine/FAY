import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({
  clubId: z.string().nullable().optional(),
  // Varios clubes a la vez (doble club): el primero queda como principal.
  clubIds: z.array(z.string()).min(2).optional(),
  // Si el club no existe todavía, se crea con este nombre (o se reutiliza
  // uno existente con el mismo nombre) y se asigna al regatista.
  nuevoClubNombre: z.string().trim().min(2, 'Mínimo 2 caracteres').optional(),
});

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
    const body = bodySchema.parse(await request.json());

    if (body.clubIds) {
      const ids = [...new Set(body.clubIds)];
      const existentes = await prisma.club.count({ where: { id: { in: ids } } });
      if (existentes !== ids.length) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
      await prisma.regatista.update({
        where: { id },
        data: { clubId: ids[0], otrosClubes: { set: ids.slice(1).map((c) => ({ id: c })) } },
      });
      return NextResponse.json({ ok: true });
    }
    let clubId = body.clubId ?? null;

    if (body.nuevoClubNombre) {
      const nombre = body.nuevoClubNombre;
      const existente = await prisma.club.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
      clubId = (existente ?? (await prisma.club.create({ data: { nombre } }))).id;
    } else if (clubId) {
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    await prisma.regatista.update({ where: { id }, data: { clubId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/regatistas/[id]/club');
  }
}
