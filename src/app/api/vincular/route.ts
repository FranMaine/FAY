import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria } from '@/lib/auditoria';
import { verificacionSchema, ACCION_SOLICITUD } from '@/lib/vinculacion';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const json = await request.json();
    const regatistaId = json?.regatistaId;
    if (!regatistaId) {
      return NextResponse.json({ error: 'Falta regatistaId' }, { status: 400 });
    }

    // Para pedir la vinculación hay que aportar algo que solo la persona real
    // sabe (número de vela, club o último campeonato) y declarar que el
    // perfil es suyo: el administrador lo compara con la ficha antes de
    // aprobar (ver /admin/solicitudes).
    const verificacion = verificacionSchema.safeParse(json?.verificacion ?? {});
    if (!verificacion.success) {
      return NextResponse.json({ error: verificacion.error.issues[0]?.message ?? 'Datos de verificación inválidos' }, { status: 400 });
    }

    // Check if the regatista is already linked to someone
    const existingLinkedUser = await prisma.user.findFirst({
      where: { regatistaId },
    });

    if (existingLinkedUser) {
      return NextResponse.json({ error: 'Este perfil ya fue reclamado por otro usuario.' }, { status: 400 });
    }

    // Check if user already has a pending or approved request
    const existingRequest = await prisma.solicitudVinculacion.findFirst({
      where: {
        userId: session.user.id,
        estado: { in: ['PENDIENTE', 'APROBADA'] }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Ya tienes una solicitud de vinculación activa o aprobada.' }, { status: 400 });
    }

    // Create the request
    const solicitud = await prisma.solicitudVinculacion.create({
      data: {
        userId: session.user.id,
        regatistaId,
        estado: 'PENDIENTE'
      }
    });

    // Lo declarado se guarda en la auditoría, atado a la solicitud (no hay
    // columnas propias para esto todavía).
    await registrarAuditoria(
      { email: session.user.email || session.user.id, name: session.user.name },
      ACCION_SOLICITUD,
      'SolicitudVinculacion',
      solicitud.id,
      { ...verificacion.data, regatistaId }
    );

    return NextResponse.json(solicitud);
  } catch (error) {
    return handleApiError(error, 'POST /api/vincular');
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const solicitud = await prisma.solicitudVinculacion.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        regatista: { select: { nombre: true, club: { select: { nombre: true } } } }
      }
    });

    return NextResponse.json(solicitud || null);
  } catch (error) {
    return handleApiError(error, 'GET /api/vincular');
  }
}

// Desvincula la cuenta del perfil de regatista al que está conectada -lo
// inverso del POST de arriba. Además de sacar el regatistaId, borra las
// solicitudes de vinculación (PENDIENTE/APROBADA) de este usuario: si no
// se borraran, una vinculación nueva más adelante chocaría con el chequeo
// de "ya tenés una solicitud activa o aprobada" del POST, con una
// solicitud vieja que ya no tiene sentido (apunta a una vinculación que
// el usuario mismo deshizo).
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { regatistaId: null },
    });
    await prisma.solicitudVinculacion.deleteMany({
      where: { userId: session.user.id, estado: { in: ['PENDIENTE', 'APROBADA'] } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/vincular');
  }
}
