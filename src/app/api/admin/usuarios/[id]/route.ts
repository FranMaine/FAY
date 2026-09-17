import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({ role: z.enum(['ADMIN', 'ORGANIZADOR', 'REGULAR']) });

// Cambia el rol de un usuario -pensado para que un admin le dé a alguien
// acceso de ORGANIZADOR (crear/editar campeonatos, cargar resultados,
// sin acceso a clubes/regatistas/etc) para la persona del club que
// organiza una regata puntual, o ADMIN completo, sin tener que tocar la
// base a mano.
//
// Dos salvaguardas para no dejar el sitio sin ningún admin por accidente:
// no te podés sacar el rol de ADMIN a vos mismo, y no se puede sacar el
// rol al último ADMIN que queda.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { role } = bodySchema.parse(await request.json());

    if (role !== 'ADMIN') {
      if (id === session.user.id) {
        return NextResponse.json({ error: 'No podés sacarte el rol de administrador a vos mismo' }, { status: 400 });
      }
      const usuario = await prisma.user.findUnique({ where: { id } });
      if (usuario?.role === 'ADMIN') {
        const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (totalAdmins <= 1) {
          return NextResponse.json({ error: 'No se puede quitar el único administrador que queda' }, { status: 400 });
        }
      }
    }

    const actualizado = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json(actualizado);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/usuarios/[id]');
  }
}
