import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria, actorDe } from '@/lib/auditoria';

// Saca un regatista de los favoritos de la cuenta.
export async function DELETE(_request: Request, { params }: { params: Promise<{ regatistaId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { regatistaId } = await params;
    const { count } = await prisma.favorito.deleteMany({ where: { userId: session.user.id, regatistaId } });

    if (count > 0) {
      const regatista = await prisma.regatista.findUnique({ where: { id: regatistaId }, select: { nombre: true } });
      void registrarAuditoria(actorDe(session), 'favorito.quitar', 'Regatista', regatistaId, { nombre: regatista?.nombre });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/favoritos/[regatistaId]');
  }
}
