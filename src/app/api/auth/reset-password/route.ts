import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { hashToken } from '@/lib/tokens';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { email, token, password } = resetPasswordSchema.parse(json);
    const emailNormalizado = email.trim().toLowerCase();
    const tokenHash = hashToken(token);

    const registro = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: emailNormalizado, token: tokenHash } },
    });

    if (!registro || registro.expires < new Date()) {
      return NextResponse.json(
        { error: 'El enlace es inválido o ya venció. Pedí uno nuevo.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Actualizamos la contraseña y consumimos el token en la misma
    // transacción -así un segundo intento con el mismo enlace (doble clic,
    // o alguien que lo interceptó después de usado) no puede reutilizarlo.
    await prisma.$transaction([
      prisma.user.update({ where: { email: emailNormalizado }, data: { passwordHash } }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: emailNormalizado, token: tokenHash } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/reset-password');
  }
}
