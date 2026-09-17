import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

const bodySchema = z.object({ nombre: z.string().trim().min(2, 'Mínimo 2 caracteres') });

// Renombra un regatista puntual -pensado para "completar" un apellido
// suelto (ej: "PRUDEN") con el nombre completo real cuando un admin lo
// investigó y confirmó que es una persona distinta a los candidatos
// sugeridos, en vez de dejarlo para siempre como una sola palabra (ver
// /admin/regatistas/duplicados, opción "Crear como nuevo regatista").
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { nombre } = bodySchema.parse(await request.json());

    const regatista = await prisma.regatista.update({ where: { id }, data: { nombre } });
    return NextResponse.json(regatista);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/regatistas/[id]');
  }
}
