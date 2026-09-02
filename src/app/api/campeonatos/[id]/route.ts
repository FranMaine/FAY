import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { campeonatoSchema, campeonatoPatchSchema } from '@/lib/validators';
import { generarClasificacion } from '@/lib/scoring';

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
    const isAdmin = session?.user?.role === 'ADMIN';

    if (campeonato.estado !== 'PUBLICADO' && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const regatistasMap = new Map();
    campeonato.regatas.forEach((regata: any) => {
      regata.resultados.forEach((resultado: any) => {
        const { regatista } = resultado;
        if (!regatistasMap.has(regatista.id)) {
          regatistasMap.set(regatista.id, {
            regatistaId: regatista.id,
            nombre: regatista.nombre,
            club: regatista.clubId || null,
            resultados: []
          });
        }
        regatistasMap.get(regatista.id).resultados.push({
          regataNumero: regata.numero,
          puesto: resultado.puesto,
          puntos: resultado.puntos,
          observacion: resultado.observacion
        });
      });
    });
    const regatistas = Array.from(regatistasMap.values());
    const clasificacion = generarClasificacion(regatistas, campeonato.descartes);

    return NextResponse.json({
      campeonato,
      clasificacion,
    });
  } catch (error) {
    console.error('Error fetching campeonato detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = campeonatoSchema.parse(json);

    const campeonato = await prisma.campeonato.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(campeonato);
  } catch (error) {
    console.error('Error updating campeonato:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Cambio puntual de estado y/o descartes, sin tener que reenviar el
// formulario completo del campeonato.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = campeonatoPatchSchema.parse(json);

    const campeonato = await prisma.campeonato.update({
      where: { id },
      data: {
        ...(body.estado !== undefined ? { estado: body.estado } : {}),
        ...(body.descartes !== undefined ? { descartes: body.descartes } : {}),
      },
    });

    return NextResponse.json(campeonato);
  } catch (error) {
    console.error('Error updating campeonato:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
