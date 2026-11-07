import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria } from '@/lib/auditoria';
import { sendEmail, emailRespuestaContacto } from '@/lib/email';
import { TEXTO_CHAT_MAX, nuevoTokenChat, urlChat } from '@/lib/chat-contacto';

const bodySchema = z.object({ respuesta: z.string().trim().min(1, 'Escribí la respuesta').max(TEXTO_CHAT_MAX, `Máximo ${TEXTO_CHAT_MAX} caracteres`) });

// El admin contesta dentro de la conversación de un mensaje de /contacto: se
// suma a la cadena y se avisa por las dos vías a la vez -mail con el link
// privado del chat (siempre) y aviso dentro de la app (si tiene cuenta: la
// que usó al escribir o, si no, una cuenta con ese mismo email ya verificado).
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
    if (mensaje.estado === 'CERRADO') {
      return NextResponse.json({ error: 'La conversación está cerrada: reabrila para responder.' }, { status: 409 });
    }

    let userId = mensaje.userId;
    if (!userId) {
      const cuenta = await prisma.user.findFirst({
        where: { email: { equals: mensaje.email, mode: 'insensitive' }, emailVerified: { not: null } },
        select: { id: true },
      });
      userId = cuenta?.id ?? null;
    }
    // Conversaciones anteriores a los chats no tenían link privado.
    const token = mensaje.token ?? nuevoTokenChat();

    const entrada = await prisma.mensajeContactoEntrada.create({
      data: { mensajeId: id, autor: 'ADMIN', texto: respuesta },
      select: { id: true, autor: true, texto: true, createdAt: true },
    });
    const actualizado = await prisma.mensajeContacto.update({
      where: { id },
      data: { respuestaLeida: !userId, leido: true, userId, token, ultimaActividad: new Date() },
      select: { id: true, leido: true, userId: true, token: true, estado: true, ultimaActividad: true },
    });

    const { subject, html } = emailRespuestaContacto({
      nombre: mensaje.nombre,
      asunto: mensaje.asunto,
      respuesta,
      urlChat: urlChat(token),
    });
    await sendEmail({ to: mensaje.email, subject, html });

    void registrarAuditoria(
      { email: session.user.email || session.user.id, name: session.user.name },
      'mensaje.responder',
      'MensajeContacto',
      id,
      { enApp: !!userId }
    );

    return NextResponse.json({ success: true, enApp: !!userId, entrada, mensaje: actualizado });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/mensajes/[id]/responder');
  }
}
