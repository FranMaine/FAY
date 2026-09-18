import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cambiarPasswordSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { passwordActual, passwordNueva } = cambiarPasswordSchema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'Esta cuenta no tiene contraseña propia (te registraste con Google u otro proveedor).' },
        { status: 400 }
      );
    }

    const esValida = await bcrypt.compare(passwordActual, user.passwordHash);
    if (!esValida) {
      return NextResponse.json({ error: 'La contraseña actual no es correcta' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(passwordNueva, 10);
    await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/mi-perfil/password');
  }
}
