import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { subirImagen, borrarImagen, ImagenInvalidaError } from '@/lib/upload-imagen';

// El recorte de fondo del escudo (quitarFondoLiso) puede tardar unos
// segundos con fotos grandes -el default de Vercel (10s en Hobby) puede
// no alcanzar.
export const maxDuration = 30;

async function getRegatistaVinculado(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.regatistaId) return null;
  return prisma.regatista.findUnique({ where: { id: user.regatistaId } });
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const regatista = await getRegatistaVinculado(session.user.id);
    if (!regatista) {
      return NextResponse.json({ error: 'Tu cuenta todavía no está vinculada a ningún perfil de regatista' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const fotoUrl = await subirImagen(file, 'regatistas', regatista.id, 320);
    await prisma.regatista.update({ where: { id: regatista.id }, data: { fotoUrl } });
    if (regatista.fotoUrl) await borrarImagen(regatista.fotoUrl);

    return NextResponse.json({ fotoUrl });
  } catch (error) {
    if (error instanceof ImagenInvalidaError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, 'PATCH /api/mi-perfil/foto');
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const regatista = await getRegatistaVinculado(session.user.id);
    if (!regatista) {
      return NextResponse.json({ error: 'Tu cuenta todavía no está vinculada a ningún perfil de regatista' }, { status: 400 });
    }

    if (regatista.fotoUrl) await borrarImagen(regatista.fotoUrl);
    await prisma.regatista.update({ where: { id: regatista.id }, data: { fotoUrl: null } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/mi-perfil/foto');
  }
}
