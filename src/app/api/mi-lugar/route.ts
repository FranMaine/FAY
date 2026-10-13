import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LUGAR_PREDETERMINADO, lugarDeClub } from '@/lib/lugares';

// A qué lugar corresponde la persona que está mirando: el del club de su
// perfil de regatista (si vinculó su cuenta a uno). Sin sesión, sin perfil
// vinculado o con un club cuyo lugar no se conoce, devuelve el
// predeterminado -esta ruta nunca falla hacia el cliente, el navbar sigue
// funcionando con San Isidro. Es por usuario, así que no se cachea.
//
// Se consulta la base en vez de leer regatistaId de la sesión: ese valor
// viaja en el JWT desde el login y queda desactualizado si la persona
// vincula su perfil después (mismo motivo por el que /mi-perfil relee el
// usuario).
export async function GET() {
  const sinCache = { headers: { 'Cache-Control': 'private, no-store' } };
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ slug: LUGAR_PREDETERMINADO.slug }, sinCache);

    const usuario = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { regatista: { select: { club: { select: { nombre: true } } } } },
    });
    return NextResponse.json({ slug: lugarDeClub(usuario?.regatista?.club?.nombre).slug }, sinCache);
  } catch {
    return NextResponse.json({ slug: LUGAR_PREDETERMINADO.slug }, sinCache);
  }
}
