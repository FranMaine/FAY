import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contactoSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { permitir, ipDeRequest } from '@/lib/rate-limit';
import { pareceSpam } from '@/lib/spam-guard';
import { sendEmail, emailNuevoMensajeContacto } from '@/lib/email';
import { EMAIL_AVISOS } from '@/lib/site';

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

    // Aviso por mail a la casilla de la web -mejor esfuerzo, ver sendEmail:
    // si RESEND_API_KEY no está configurada o el envío falla, el mensaje ya
    // quedó guardado en /admin/mensajes de todas formas. replyTo: "Responder"
    // en el mail le contesta directo a quien escribió (el remitente es
    // no-responder@, que nadie lee).
    const { subject, html } = emailNuevoMensajeContacto({ nombre, email, asunto, mensaje });
    await sendEmail({ to: EMAIL_AVISOS, subject, html, replyTo: email });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/contacto');
  }
}
