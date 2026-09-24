import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { generarToken } from '@/lib/tokens';
import { sendEmail, emailResetPassword } from '@/lib/email';
import { permitir, ipDeRequest } from '@/lib/rate-limit';
import { pareceSpam } from '@/lib/spam-guard';

const UNA_HORA_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Este endpoint manda un mail de verdad -sin límite, alguien podría
    // usarlo para bombardear la casilla de otra persona con enlaces de
    // reseteo. 5 pedidos por IP cada 10 minutos alcanza de sobra para un
    // uso legítimo (probar con distintos emails propios/olvidados).
    if (!(await permitir(`forgot-password:${ipDeRequest(request)}`, 5, 10 * 60 * 1000))) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
    }

    const json = await request.json();

    // Honeypot: si cayó, respondemos el mismo mensaje genérico de éxito de
    // siempre (sin mandar ningún mail) en vez de un error -mismo criterio
    // que ya usa este endpoint para no filtrar si un email existe o no.
    if (pareceSpam({ trampa: json.sitioWeb, montadoEn: json.montadoEn })) {
      return NextResponse.json({
        message: 'Si el email existe en nuestro sistema, te enviamos un enlace para restablecer tu contraseña.',
      });
    }

    const { email } = forgotPasswordSchema.parse(json);
    const emailNormalizado = email.trim().toLowerCase();

    // El límite de arriba es por IP -alguien con varias IPs (proxies
    // rotativos) podría seguir mandándole mails de reseteo a la MISMA
    // persona sin tope. Este segundo límite es por email destino, así que
    // corta eso independientemente de cuántas IPs use el que lo pide. Si
    // se pasa, seguimos devolviendo el mismo mensaje genérico de siempre
    // (nunca un error distinto) para no filtrar que ese email existe y
    // además está siendo bombardeado.
    const puedeEnviar = await permitir(`forgot-password-email:${emailNormalizado}`, 3, 60 * 60 * 1000);

    const user = puedeEnviar ? await prisma.user.findUnique({ where: { email: emailNormalizado } }) : null;

    // Respondemos siempre lo mismo exista o no la cuenta, y también si es
    // una cuenta que solo tiene login con Google (sin passwordHash) -si no,
    // este endpoint serviría para que cualquiera adivine qué emails están
    // registrados probando uno por uno.
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
