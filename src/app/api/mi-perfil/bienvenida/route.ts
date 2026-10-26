import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria, actorDe } from '@/lib/auditoria';

const bodySchema = z.object({
  // Sin perfilUso = "ahora no": se marca la bienvenida como vista y no se
  // vuelve a mostrar, sin cambiar lo que ya hubiera elegido.
  perfilUso: z.enum(['NAVEGANTE', 'FAMILIAR', 'ESPECTADOR']).optional(),
});

// Guarda cómo dice la persona que usa el sitio (ver /bienvenida) y marca la
// bienvenida como vista.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { perfilUso } = bodySchema.parse(await request.json());

    await prisma.user.update({
      where: { id: session.user.id },
      data: { bienvenidaEn: new Date(), ...(perfilUso ? { perfilUso } : {}) },
    });

    if (perfilUso) {
      void registrarAuditoria(actorDe(session), 'perfil.elegir_uso', 'User', session.user.id, { perfilUso });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, 'POST /api/mi-perfil/bienvenida');
  }
}
