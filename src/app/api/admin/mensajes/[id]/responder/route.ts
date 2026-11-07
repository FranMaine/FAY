import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria } from '@/lib/auditoria';
import { sendEmail, emailRespuestaContacto } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

const bodySchema = z.object({ respuesta: z.string().trim().min(2, 'Escribí la respuesta').max(4000, 'Máximo 4000 caracteres') });

// Responde un mensaje de /contacto: la respuesta se guarda en el mensaje y
// se entrega por las dos vías a la vez -mail al email que dejó la persona
// (siempre) y aviso dentro de la app (si tiene cuenta: la que usó al
// escribir o, si no, una cuenta con ese mismo email ya verificado).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { respuesta } = bodySchema.parse(await request.json());

    const mensaje = await prisma.mensajeContacto.findUnique({ where: { id } });
    if (!mensaje) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });

    let userId = mensaje.userId;
    if (!userId) {
      const cuenta = await prisma.user.findFirst({
        where: { email: { equals: mensaje.email, mode: 'insensitive' }, emailVerified: { not: null } },
        select: { id: true },
      });
      userId = cuenta?.id ?? null;
    }

    const actualizado = await prisma.mensajeContacto.update({
      where: { id },
      data: { respuesta, respondidoEn: new Date(), respuestaLeida: !userId, leido: true, userId },
    });

    const { subject, html } = emailRespuestaContacto({
      nombre: mensaje.nombre,
      asunto: mensaje.asunto,
      mensajeOriginal: mensaje.mensaje,
      respuesta,
      urlApp: userId ? `${SITE_URL}/mi-perfil/mensajes` : null,
    });
    await sendEmail({ to: mensaje.email, subject, html });

    void registrarAuditoria(
      { email: session.user.email || session.user.id, name: session.user.name },
      'mensaje.responder',
      'MensajeContacto',
      id,
      { enApp: !!userId }
    );

    return NextResponse.json({ success: true, enApp: !!userId, mensaje: actualizado });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/mensajes/[id]/responder');
  }
}
