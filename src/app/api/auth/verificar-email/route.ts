import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { hashToken } from '@/lib/tokens';

const PREFIJO_VERIFICACION = 'verify:';

const bodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { email, token } = bodySchema.parse(await request.json());
    const emailNormalizado = email.trim().toLowerCase();
    const identifier = `${PREFIJO_VERIFICACION}${emailNormalizado}`;
    const tokenHash = hashToken(token);

    const registro = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: tokenHash } },
    });

    if (!registro || registro.expires < new Date()) {
      return NextResponse.json({ error: 'El enlace es inválido o ya venció. Pedí uno nuevo desde tu perfil.' }, { status: 400 });
    }

    // Mismo patrón que reset-password: marcar verificado y consumir el
    // token en el mismo array de $transaction (no interactivo -ver el
    // comentario largo sobre esto en regatista-merge.ts), así un segundo
    // intento con el mismo link no puede "reverificar" ni reusar el token.
    await prisma.$transaction([
      prisma.user.update({ where: { email: emailNormalizado }, data: { emailVerified: new Date() } }),
      prisma.verificationToken.delete({ where: { identifier_token: { identifier, token: tokenHash } } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/verificar-email');
  }
}
