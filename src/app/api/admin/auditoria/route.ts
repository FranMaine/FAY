import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// Lista las últimas acciones registradas por registrarAuditoria() (ver
// src/lib/auditoria.ts). A cada una le agrega el nombre de lo que tocó
// (campeonato, regatista o club) para que la pantalla muestre nombres y no
// códigos; si ya se borró, queda sin nombre y la pantalla usa el que quedó
// guardado en el detalle.
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

    const detalleDe = (r: { detalle: unknown }) => (r.detalle ?? {}) as Record<string, unknown>;
    const ids = (entidad: string) =>
      [...new Set(registros.filter((r) => r.entidad === entidad && r.entidadId).map((r) => r.entidadId as string))];
    const idsCampeonato = [
      ...new Set([
        ...ids('Campeonato'),
        ...registros
          .filter((r) => r.entidad === 'Regata')
          .map((r) => detalleDe(r).campeonatoId)
          .filter((v): v is string => typeof v === 'string'),
      ]),
    ];

    const [campeonatos, regatistas, clubes] = await Promise.all([
      prisma.campeonato.findMany({ where: { id: { in: idsCampeonato } }, select: { id: true, nombre: true, anio: true } }),
      prisma.regatista.findMany({ where: { id: { in: ids('Regatista') } }, select: { id: true, nombre: true } }),
      prisma.club.findMany({ where: { id: { in: ids('Club') } }, select: { id: true, nombre: true } }),
    ]);
    const nombreCampeonato = new Map(campeonatos.map((c) => [c.id, `${c.nombre} ${c.anio}`]));
    const nombreRegatista = new Map(regatistas.map((r) => [r.id, r.nombre]));
    const nombreClub = new Map(clubes.map((c) => [c.id, c.nombre]));

    return NextResponse.json(
      registros.map((r) => {
        const id = r.entidadId ?? '';
        const entidadNombre =
          r.entidad === 'Campeonato' ? nombreCampeonato.get(id)
          : r.entidad === 'Regatista' ? nombreRegatista.get(id)
          : r.entidad === 'Club' ? nombreClub.get(id)
          : undefined;
        const campeonatoId = r.entidad === 'Regata' ? detalleDe(r).campeonatoId : undefined;
        return {
          ...r,
          entidadNombre: entidadNombre ?? null,
          campeonatoNombre: typeof campeonatoId === 'string' ? nombreCampeonato.get(campeonatoId) ?? null : null,
        };
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/auditoria');
  }
}
