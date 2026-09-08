import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { generarToken } from '@/lib/tokens';
import { sendEmail, emailResetPassword } from '@/lib/email';

const UNA_HORA_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { email } = forgotPasswordSchema.parse(json);
    const emailNormalizado = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: emailNormalizado } });

    // Respondemos siempre lo mismo exista o no la cuenta, y también si es
    // una cuenta que solo tiene login con Google (sin passwordHash) -si no,
    // este endpoint serviría para que cualquiera adivine qué emails están
    // registrados en FAY probando uno por uno.
    if (user && user.passwordHash) {
      // Invalidamos cualquier token anterior sin usar para este email antes
      // de generar uno nuevo, así un pedido de reset viejo no queda vivo.
      await prisma.verificationToken.deleteMany({ where: { identifier: emailNormalizado } });

      const { token, tokenHash } = generarToken();
      await prisma.verificationToken.create({
        data: {
          identifier: emailNormalizado,
          token: tokenHash,
          expires: new Date(Date.now() + UNA_HORA_MS),
        },
      });

      const origin = new URL(request.url).origin;
      const link = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(emailNormalizado)}`;

      void sendEmail({ to: emailNormalizado, ...emailResetPassword(link) });
    }

    return NextResponse.json({
      message: 'Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/forgot-password');
  }
}
