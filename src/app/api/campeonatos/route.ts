import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { campeonatoSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');
    const claseId = searchParams.get('claseId');
    const estado = searchParams.get('estado');

    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    const where: any = {};
    if (anio) where.anio = parseInt(anio, 10);
    if (claseId) where.claseId = claseId;
    
    if (estado) {
      if (estado !== 'PUBLICADO' && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      where.estado = estado;
    } else if (!isAdmin) {
      where.estado = 'PUBLICADO';
    }

    const campeonatos = await prisma.campeonato.findMany({
      where,
      include: {
        clase: true,
        sede: true,
      },
      orderBy: [
        { anio: 'desc' },
        { fechaInicio: 'desc' },
      ],
    });

    return NextResponse.json(campeonatos);
  } catch (error) {
    return handleApiError(error, 'GET /api/campeonatos');
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = campeonatoSchema.parse(json);

    const campeonato = await prisma.campeonato.create({
      data: body,
    });

    return NextResponse.json(campeonato, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/campeonatos');
  }
}
