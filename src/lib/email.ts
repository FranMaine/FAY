import { Resend } from 'resend';

// Envío de emails transaccionales (ej: confirmación de vinculación de
// perfil). Usamos Resend porque no había ningún proveedor de mail
// configurado en el proyecto. Si RESEND_API_KEY no está seteada (por
// ejemplo en desarrollo local), no rompemos el flujo que dispara el
// email -sólo lo dejamos anotado en consola- así una demora en configurar
// el proveedor no puede tirar abajo una aprobación de solicitud u otra
// acción de admin.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM || 'FAY Stats <onboarding@resend.dev>';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada -no se envió el mail "${subject}" a ${to}. ` +
      'Configurá RESEND_API_KEY (y opcionalmente EMAIL_FROM) para habilitar el envío real.'
    );
    return;
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    // Un fallo de envío no debe deshacer la acción que lo disparó (ej. la
    // aprobación de una vinculación ya se confirmó en la base).
    console.error(`[email] Error enviando "${subject}" a ${to}:`, error);
  }
}

export function emailResetPassword(link: string) {
  return {
    subject: 'Recuperá tu contraseña de FAY Stats',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Recuperar contraseña</h2>
        <p>Pediste restablecer tu contraseña en FAY Stats. Hacé clic en el siguiente botón para elegir una nueva:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Restablecer contraseña</a>
        </p>
        <p style="color: #94a3b8; font-size: 13px;">Si no pediste esto, podés ignorar este mail -tu contraseña actual sigue funcionando. El enlace vence en 1 hora.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Federación Argentina de Yachting · FAY Stats</p>
      </div>
    `,
  };
}

export function emailVinculacionAprobada(nombreRegatista: string) {
  return {
    subject: 'Tu perfil de regatista fue vinculado',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">¡Cuenta verificada!</h2>
        <p>Tu cuenta de FAY Stats fue vinculada correctamente al perfil de regatista de <strong>${nombreRegatista}</strong>.</p>
        <p>A partir de ahora vas a ver tu historial de resultados en tu perfil.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Federación Argentina de Yachting · FAY Stats</p>
      </div>
    `,
  };
}
