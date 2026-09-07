import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buscarRegatistasDuplicados } from '@/lib/regatista-merge';
import { handleApiError } from '@/lib/api-error';

// Lista grupos de regatistas cuyo nombre coincide (ignorando mayúsculas y
// espacios de más) -candidatos a ser la misma persona real cargada dos
// veces, para revisar y fusionar desde el panel de admin en vez de que
// haya que arreglarlo a mano en la base cada vez que pasa.
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const grupos = await buscarRegatistasDuplicados();
    return NextResponse.json({ grupos });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/regatistas/duplicados');
  }
}
