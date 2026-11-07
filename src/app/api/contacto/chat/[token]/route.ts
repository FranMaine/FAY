import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { permitir, ipDeRequest } from '@/lib/rate-limit';
import { sendEmail, emailRespuestaDelUsuario } from '@/lib/email';
import { EMAIL_AVISOS } from '@/lib/site';
import { TEXTO_CHAT_MAX } from '@/lib/chat-contacto';

const bodySchema = z.object({ texto: z.string().trim().min(1, 'Escribí tu mensaje').max(TEXTO_CHAT_MAX, `Máximo ${TEXTO_CHAT_MAX} caracteres`) });

// Conversación de /contacto vista por la persona que escribió: se entra con
// el token privado del link (no hace falta cuenta). Devuelve el mensaje
// inicial y todas las respuestas en orden, y marca como vistas las del admin.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!(await permitir(`chat-ver:${ipDeRequest(request)}`, 120, 10 * 60 * 1000))) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
    }
    const conversacion = await prisma.mensajeContacto.findUnique({
      where: { token },
      select: {
        id: true, nombre: true, asunto: true, mensaje: true, createdAt: true, estado: true, cerradoEn: true, respuestaLeida: true,
        entradas: { orderBy: { createdAt: 'asc' }, select: { id: true, autor: true, texto: true, createdAt: true } },
      },
    });
    if (!conversacion) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });

    if (!conversacion.respuestaLeida) {
      await prisma.mensajeContacto.update({ where: { id: conversacion.id }, data: { respuestaLeida: true } });
    }
    const { id: _id, respuestaLeida: _leida, ...datos } = conversacion;
    void _id;
    void _leida;
    return NextResponse.json(datos);
  } catch (error) {
    return handleApiError(error, 'GET /api/contacto/chat/[token]');
  }
}

// La persona contesta dentro de una conversación abierta: se agrega a la
// cadena y se le avisa por mail al admin. Si el admin ya cerró el chat, no
// se puede seguir escribiendo.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!(await permitir(`chat-enviar:${token}:${ipDeRequest(request)}`, 15, 10 * 60 * 1000))) {
      return NextResponse.json({ error: 'Demasiados mensajes. Probá de nuevo en unos minutos.' }, { status: 429 });
    }
    const { texto } = bodySchema.parse(await request.json());

    const conversacion = await prisma.mensajeContacto.findUnique({ where: { token } });
    if (!conversacion) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    if (conversacion.estado === 'CERRADO') {
      return NextResponse.json({ error: 'Esta conversación fue cerrada. Si necesitás algo más, escribinos de nuevo desde Contacto.' }, { status: 409 });
    }

    const entrada = await prisma.mensajeContactoEntrada.create({
      data: { mensajeId: conversacion.id, autor: 'USUARIO', texto },
      select: { id: true, autor: true, texto: true, createdAt: true },
    });
    await prisma.mensajeContacto.update({
      where: { id: conversacion.id },
      data: { leido: false, ultimaActividad: new Date() },
    });

    const { subject, html } = emailRespuestaDelUsuario({ nombre: conversacion.nombre, email: conversacion.email, asunto: conversacion.asunto, texto });
    await sendEmail({ to: EMAIL_AVISOS, subject, html, replyTo: conversacion.email });

    return NextResponse.json({ success: true, entrada }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/contacto/chat/[token]');
  }
}
