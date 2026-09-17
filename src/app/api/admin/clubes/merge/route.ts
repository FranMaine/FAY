import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { fusionarClubes } from '@/lib/club-merge';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({
  canonicoId: z.string(),
  duplicadoIds: z.array(z.string()).min(1),
});

// Fusiona uno o más clubes duplicados dentro de un club canónico (ver
// fusionarClubes en src/lib/club-merge.ts) -usado desde /admin/clubes para
// resolver a mano los casos de sigla ambigua (ej: "CNP").
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const json = await request.json();
    const body = bodySchema.parse(json);

    if (body.duplicadoIds.includes(body.canonicoId)) {
      return NextResponse.json({ error: 'El club canónico no puede estar en la lista de duplicados' }, { status: 400 });
    }

    const resumen = await fusionarClubes(body.canonicoId, body.duplicadoIds);
    return NextResponse.json({ success: true, resumen });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/clubes/merge');
  }
}
