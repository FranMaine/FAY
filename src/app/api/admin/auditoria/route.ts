import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Lista las últimas acciones administrativas sensibles registradas por
// registrarAuditoria() (ver src/lib/auditoria.ts).
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const registros = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return NextResponse.json(registros);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/auditoria');
  }
}
