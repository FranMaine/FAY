import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contactoSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { permitir, ipDeRequest } from '@/lib/rate-limit';
import { pareceSpam } from '@/lib/spam-guard';
import { sendEmail, emailNuevoMensajeContacto } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // A lo sumo 5 mensajes por IP cada 10 minutos -mismo criterio que
    // /api/registro, para frenar spam sin molestar a una persona real.
    if (!(await permitir(`contacto:${ipDeRequest(request)}`, 5, 10 * 60 * 1000))) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
    }

    const json = await request.json();

    // Mismo criterio que /api/registro: si parece spam, respondemos como
    // si hubiera salido bien (sin guardar nada) en vez de un error, para
    // no darle a un bot una señal de "detectado" distinta de "éxito".
    if (pareceSpam({ trampa: json.sitioWeb, montadoEn: json.montadoEn })) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const { nombre, email, asunto, mensaje } = contactoSchema.parse(json);

    await prisma.mensajeContacto.create({ data: { nombre, email, asunto, mensaje } });

    // Notificación por mail a los ADMIN -mejor esfuerzo, ver sendEmail: si
    // RESEND_API_KEY no está configurada o el envío falla, el mensaje ya
    // quedó guardado en /admin/mensajes de todas formas.
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
    const { subject, html } = emailNuevoMensajeContacto({ nombre, email, asunto, mensaje });
    for (const admin of admins) {
      void sendEmail({ to: admin.email, subject, html });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/contacto');
  }
}
