import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { ACCION_SOLICITUD, senalesDeSolicitud, type VerificacionDeclarada } from '@/lib/vinculacion';

// Solicitudes pendientes con todo lo que el administrador necesita para
// decidir: lo que declaró la persona, los datos de la ficha y las señales
// (coincidencias y alertas) que salen de compararlos.
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const solicitudes = await prisma.solicitudVinculacion.findMany({
      where: { estado: 'PENDIENTE' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        regatista: {
          select: { id: true, nombre: true, fuenteIds: true, club: { select: { nombre: true } }, _count: { select: { resultados: true } } },
        },
      },
    });

    const ids = solicitudes.map((s) => s.id);
    const userIds = [...new Set(solicitudes.map((s) => s.userId))];

    const [registros, totales] = await Promise.all([
      prisma.auditLog.findMany({
        where: { accion: ACCION_SOLICITUD, entidadId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        select: { entidadId: true, detalle: true },
      }),
      prisma.solicitudVinculacion.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      }),
    ]);
    const declaradoDe = new Map<string, Partial<VerificacionDeclarada>>();
    for (const r of registros) {
      if (r.entidadId && !declaradoDe.has(r.entidadId)) declaradoDe.set(r.entidadId, r.detalle as Partial<VerificacionDeclarada>);
    }
    const totalDe = new Map(totales.map((t) => [t.userId, t._count._all]));

    const ahora = new Date();
    const respuesta = await Promise.all(
      solicitudes.map(async (s) => {
        const ultimo = await prisma.resultado.findFirst({
          where: { regatistaId: s.regatistaId },
          orderBy: { regata: { campeonato: { anio: 'desc' } } },
          select: { regata: { select: { campeonato: { select: { nombre: true, anio: true } } } } },
        });
        const numeroVela = (s.regatista.fuenteIds as { vela?: string } | null)?.vela ?? null;
        const declarado = declaradoDe.get(s.id) ?? null;

        return {
          id: s.id,
          createdAt: s.createdAt,
          user: s.user,
          regatista: {
            id: s.regatista.id,
            nombre: s.regatista.nombre,
            club: s.regatista.club?.nombre ?? null,
            numeroVela,
            resultados: s.regatista._count.resultados,
            ultimoCampeonato: ultimo ? `${ultimo.regata.campeonato.nombre} ${ultimo.regata.campeonato.anio}` : null,
          },
          declarado,
          senales: senalesDeSolicitud({
            nombreCuenta: s.user.name,
            nombreFicha: s.regatista.nombre,
            clubFicha: s.regatista.club?.nombre ?? null,
            numeroVelaFicha: numeroVela,
            declarado,
            cuentaCreadaEn: s.user.createdAt,
            ahora,
            solicitudesDeLaCuenta: totalDe.get(s.userId) ?? 1,
          }),
        };
      })
    );

    return NextResponse.json(respuesta);
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/solicitudes');
  }
}
