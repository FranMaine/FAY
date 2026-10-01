import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { eliminarClubesVacios } from '@/lib/club-cleanup';

// Barrido manual de los clubes que ya estaban en 0 miembros ANTES de que
// existiera la limpieza automática (ver eliminarClubesVacios en
// club-cleanup.ts, que de acá en adelante se dispara sola al reasignar o
// editar el club de un regatista) -esto resuelve el stock viejo, de una
// sola vez. Misma regla de siempre: nunca borra un club que todavía sea
// sede de algún campeonato, aunque tenga 0 regatistas propios.
export async function POST() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const candidatos = await prisma.club.findMany({
      where: { regatistas: { none: {} }, regatistasSecundarios: { none: {} } },
      select: { id: true },
    });

    const borrados = await eliminarClubesVacios(
      candidatos.map((c) => c.id),
      { email: session.user.email || session.user.id, name: session.user.name }
    );

    return NextResponse.json({ borrados: borrados.length });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/clubes/limpiar-vacios');
  }
}
