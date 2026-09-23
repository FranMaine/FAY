import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { campeonatoSchema, campeonatoPatchSchema } from '@/lib/validators';
import { generarClasificacion, agruparPorRegatista } from '@/lib/scoring';
import { handleApiError } from '@/lib/api-error';
import { puedeGestionarCampeonatos } from '@/lib/permisos';
import { registrarAuditoria } from '@/lib/auditoria';
import { revalidateTag } from 'next/cache';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campeonato = await prisma.campeonato.findUnique({
      where: { id },
      include: {
        clase: true,
        sede: true,
        regatas: {
          include: {
            resultados: {
              include: {
                regatista: true,
              },
            },
          },
          orderBy: { numero: 'asc' },
        },
      },
    });

    if (!campeonato) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const session = await auth();
    const isAdmin = puedeGestionarCampeonatos(session?.user?.role);

    if (campeonato.estado !== 'PUBLICADO' && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const regatistas = agruparPorRegatista(campeonato.regatas);
    const clasificacion = generarClasificacion(regatistas, campeonato.descartes);

    return NextResponse.json({
      campeonato,
      clasificacion,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/campeonatos/[id]');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!puedeGestionarCampeonatos(session?.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = campeonatoSchema.parse(json);

    const campeonato = await prisma.campeonato.update({
      where: { id },
      data: { ...body, ...(body.evento !== undefined ? { evento: body.evento || null } : {}) },
    });

    revalidateTag('rankings', { expire: 0 });
    return NextResponse.json(campeonato);
  } catch (error) {
    return handleApiError(error, 'PUT /api/campeonatos/[id]');
  }
}

// Borra el campeonato y, en cascada (a nivel de base de datos), todas sus
// regatas y resultados. Irreversible: no hay soft-delete ni papelera.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!puedeGestionarCampeonatos(session?.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const borrado = await prisma.campeonato.delete({ where: { id } });

    void registrarAuditoria(
      { email: session!.user.email || session!.user.id, name: session!.user.name },
      'campeonato.eliminar',
      'Campeonato',
      id,
      { nombre: borrado.nombre, anio: borrado.anio }
    );

    revalidateTag('rankings', { expire: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/campeonatos/[id]');
  }
}

// Cambio puntual de estado, descartes y/o nombre, sin tener que reenviar el
// formulario completo del campeonato.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!puedeGestionarCampeonatos(session?.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = campeonatoPatchSchema.parse(json);

    const campeonato = await prisma.campeonato.update({
      where: { id },
      data: {
        ...(body.estado !== undefined ? { estado: body.estado } : {}),
        ...(body.descartes !== undefined ? { descartes: body.descartes } : {}),
        ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
        ...(body.evento !== undefined ? { evento: body.evento || null } : {}),
        ...(body.sedeId !== undefined ? { sedeId: body.sedeId || null } : {}),
      },
    });

    if (body.estado !== undefined) {
      void registrarAuditoria(
        { email: session!.user.email || session!.user.id, name: session!.user.name },
        'campeonato.cambiar_estado',
        'Campeonato',
        id,
        { nombre: campeonato.nombre, estadoNuevo: body.estado }
      );
    }

    revalidateTag('rankings', { expire: 0 });
    return NextResponse.json(campeonato);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/campeonatos/[id]');
  }
}
