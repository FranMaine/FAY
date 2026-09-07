import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { regatistaMergeSchema } from '@/lib/validators';
import { fusionarRegatistas } from '@/lib/regatista-merge';
import { handleApiError } from '@/lib/api-error';

// Fusiona uno o más regatistas duplicados dentro de un regatista canónico
// (ver fusionarRegatistas en lib/regatista-merge.ts para las reglas de qué
// pasa con cada resultado/solicitud/usuario vinculado).
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const json = await request.json();
    const body = regatistaMergeSchema.parse(json);

    const resumen = await fusionarRegatistas(body.canonicoId, body.duplicadoIds);
    return NextResponse.json({ success: true, resumen });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/regatistas/merge');
  }
}
