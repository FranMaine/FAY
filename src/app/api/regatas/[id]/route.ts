import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { regataResultadosSchema } from '@/lib/validators';

// Reemplaza el set de resultados de una regata existente: crea/actualiza los
// enviados y borra los que ya no vienen en el body (así "Guardar" en el
// editor de admin refleja filas agregadas y eliminadas). El regatista de
// cada fila puede venir por id (elegido de uno ya existente) o por nombre
// -se busca por coincidencia exacta insensible a mayúsculas, o se crea si
// no existe-, igual que el importador de CSV/Excel/PDF.
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

    const regataExistente = await prisma.regata.findUnique({ where: { id } });
    if (!regataExistente) {
      return NextResponse.json({ error: 'Regata no encontrada' }, { status: 404 });
    }

    const json = await request.json();
    const body = regataResultadosSchema.parse(json);

    const regatistaIdsUsados: string[] = [];

    for (const r of body.resultados) {
      let regatistaId = r.regatistaId;

      if (!regatistaId) {
        const nombreLimpio = (r.nombre || '').trim();
        const existente = await prisma.regatista.findFirst({
          where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } },
        });

        if (existente) {
          regatistaId = existente.id;
        } else {
          let clubId: string | undefined;
          if (r.club) {
            const clubStr = r.club.toUpperCase().trim();
            const club = await prisma.club.upsert({
              where: { nombre: clubStr },
              update: {},
              create: { nombre: clubStr },
            });
            clubId = club.id;
          }
          const nuevo = await prisma.regatista.create({
            data: {
              nombre: nombreLimpio,
              clubId,
              fuenteIds: r.vela ? { vela: r.vela } : undefined,
            },
          });
          regatistaId = nuevo.id;
        }
      }

      await prisma.resultado.upsert({
        where: {
          regataId_regatistaId: { regataId: id, regatistaId },
        },
        update: {
          puesto: r.puesto,
          puntos: r.puntos,
          observacion: r.observacion || null,
        },
        create: {
          regataId: id,
          regatistaId,
          puesto: r.puesto,
          puntos: r.puntos,
          observacion: r.observacion || null,
        },
      });

      regatistaIdsUsados.push(regatistaId);
    }

    // Borrar resultados que ya no están en el set enviado (filas eliminadas
    // en el editor).
    await prisma.resultado.deleteMany({
      where: {
        regataId: id,
        regatistaId: { notIn: regatistaIdsUsados.length > 0 ? regatistaIdsUsados : ['__none__'] },
      },
    });

    const regata = await prisma.regata.update({
      where: { id },
      data: {
        fecha: body.fecha,
        condiciones: body.condiciones === undefined ? undefined : body.condiciones,
      },
      include: {
        resultados: { include: { regatista: true } },
      },
    });

    return NextResponse.json(regata);
  } catch (error) {
    console.error('Error updating regata resultados:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
