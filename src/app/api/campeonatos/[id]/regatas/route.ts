import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { resultadosBulkSchema } from '@/lib/validators';

export async function POST(
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
    
    const body = resultadosBulkSchema.parse(json);

    const result = await prisma.$transaction(async (tx: any) => {
      const regata = await tx.regata.create({
        data: {
          campeonatoId: id,
          numero: body.regataNumero,
          fecha: body.fecha,
          condiciones: body.condiciones,
        },
      });

      const resultadosData = body.resultados.map((resultado) => ({
        regataId: regata.id,
        regatistaId: resultado.regatistaId,
        puesto: resultado.puesto,
        puntos: resultado.puntos,
        observacion: resultado.observacion,
      }));

      await tx.resultado.createMany({
        data: resultadosData,
      });

      return await tx.regata.findUnique({
        where: { id: regata.id },
        include: { resultados: true },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error adding regata:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
