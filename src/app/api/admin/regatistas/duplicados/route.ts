import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buscarRegatistasDuplicados, buscarCandidatosApellidoSuelto, buscarCandidatosNombreSimilar } from '@/lib/regatista-merge';
import { handleApiError } from '@/lib/api-error';

// Lista grupos de regatistas cuyo nombre coincide (ignorando mayúsculas y
// espacios de más), por separado regatistas de nombre de una sola palabra
// (ej: solo el apellido) que podrían ser una persona ya cargada con su
// nombre completo, y por separado pares de nombre completo casi idéntico
// (falta/sobra una palabra, o una palabra está mal tipeada). Todo para
// revisar y fusionar desde el panel de admin en vez de que haya que
// arreglarlo a mano en la base cada vez que pasa.
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const [grupos, apellidosSueltos, nombresSimilares] = await Promise.all([
      buscarRegatistasDuplicados(),
      buscarCandidatosApellidoSuelto(),
      buscarCandidatosNombreSimilar(),
    ]);
    return NextResponse.json({ grupos, apellidosSueltos, nombresSimilares });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/regatistas/duplicados');
  }
}
