import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria } from '@/lib/auditoria';
import { sendEmail, emailVinculacionRevocada } from '@/lib/email';

// Un administrador desvincula una cuenta de su ficha de regatista (por
// ejemplo, porque alguien se vinculó a un perfil que no era suyo). La ficha
// y sus resultados no se tocan -solo se corta el vínculo-, y se borran las
// solicitudes de esa cuenta para que pueda volver a pedir una vinculación
// (mismo criterio que cuando la propia persona se desvincula, ver
// DELETE /api/vincular). La cuenta recibe un mail explicándolo.
export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { userId } = await params;
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, regatistaId: true, regatista: { select: { nombre: true } } },
    });
    if (!usuario || !usuario.regatistaId) {
      return NextResponse.json({ error: 'Esa cuenta no está vinculada a ningún perfil' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { regatistaId: null } }),
      prisma.solicitudVinculacion.deleteMany({ where: { userId } }),
    ]);

    await registrarAuditoria(
      { email: session.user.email || session.user.id, name: session.user.name },
      'vinculacion.revocar',
      'User',
      userId,
      { email: usuario.email, regatistaId: usuario.regatistaId, regatista: usuario.regatista?.nombre }
    );

    if (usuario.regatista) {
      after(() => sendEmail({ to: usuario.email, ...emailVinculacionRevocada(usuario.regatista!.nombre) }));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/vinculaciones/[userId]');
  }
}
