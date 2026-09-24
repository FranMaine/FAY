import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { generarToken } from '@/lib/tokens';
import { sendEmail, emailVerificacion } from '@/lib/email';
import { permitir, ipDeRequest } from '@/lib/rate-limit';

const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;
const PREFIJO_VERIFICACION = 'verify:';

// Reenvía el mail de confirmación de cuenta -pensado para cuando el login
// bloquea a alguien por no haber verificado el email (ver
// EmailNoVerificadoError en src/lib/auth.ts) y no tiene forma de pedir
// otro. Mismo criterio de forgotPasswordSchema (solo pide email) y misma
// respuesta genérica siempre, exista o no la cuenta, para no filtrar qué
// emails están registrados.
export async function POST(request: Request) {
  try {
    if (!(await permitir(`reenviar-verificacion:${ipDeRequest(request)}`, 5, 10 * 60 * 1000))) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
    }

    const { email } = forgotPasswordSchema.parse(await request.json());
    const emailNormalizado = email.trim().toLowerCase();

    // Mismo criterio que forgot-password: el límite de arriba es por IP,
    // este es por email destino -corta a alguien con varias IPs
    // bombardeando la misma casilla, sin filtrar nada distinto en la
    // respuesta si se pasa.
    const puedeEnviar = await permitir(`reenviar-verificacion-email:${emailNormalizado}`, 3, 60 * 60 * 1000);

    const user = puedeEnviar ? await prisma.user.findUnique({ where: { email: emailNormalizado } }) : null;

    if (user && user.passwordHash && !user.emailVerified) {
      await prisma.verificationToken.deleteMany({ where: { identifier: `${PREFIJO_VERIFICACION}${emailNormalizado}` } });

      const { token, tokenHash } = generarToken();
      await prisma.verificationToken.create({
        data: {
          identifier: `${PREFIJO_VERIFICACION}${emailNormalizado}`,
          token: tokenHash,
          expires: new Date(Date.now() + VEINTICUATRO_HORAS_MS),
        },
      });

      const origin = new URL(request.url).origin;
      const link = `${origin}/verificar-email?token=${token}&email=${encodeURIComponent(emailNormalizado)}`;
      void sendEmail({ to: emailNormalizado, ...emailVerificacion(link) });
    }

    return NextResponse.json({
      message: 'Si la cuenta existe y falta verificarla, te enviamos un nuevo enlace de confirmación.',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/reenviar-verificacion');
  }
}
