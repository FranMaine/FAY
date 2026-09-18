import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({
  // Vacío/null borra el apodo (vuelve a mostrarse el nombre de siempre).
  apodo: z.string().trim().max(40, 'Máximo 40 caracteres').nullable(),
});

// Actualiza el apodo de la cuenta propia -a diferencia de Regatista.nombre
// (el nombre "oficial" que viene de los resultados importados), esto es
// puramente personal y solo lo puede tocar el propio usuario sobre sí
// mismo, nunca sobre otra cuenta.
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { apodo } = bodySchema.parse(await request.json());

    const usuario = await prisma.user.update({
      where: { id: session.user.id },
      data: { apodo: apodo || null },
      select: { id: true, apodo: true },
    });
    return NextResponse.json(usuario);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/mi-perfil');
  }
}

// Elimina la cuenta propia -Account/Session/SolicitudVinculacion tienen
// onDelete: Cascade hacia User en el schema, así que un solo delete acá
// se lleva todo eso con ella. Regatista NO se borra (el historial de
// resultados de esa persona sigue existiendo en el sitio, solo se
// desvincula la cuenta que lo tenía linkeado -la relación vive en
// User.regatistaId, no al revés).
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/mi-perfil');
  }
}
