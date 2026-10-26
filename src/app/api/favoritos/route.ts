import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { registrarAuditoria, actorDe } from '@/lib/auditoria';
import { MAX_FAVORITOS, ultimoResultadoDe } from '@/lib/favoritos';

const bodySchema = z.object({ regatistaId: z.string().min(1) });

// Lista los favoritos de la cuenta, del más viejo al más nuevo. Con
// ?solo=ids devuelve únicamente los ids (lo usan los botones de estrella
// para saber cuáles ya están marcados, sin calcular posiciones).
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const favoritos = await prisma.favorito.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        regatista: { select: { id: true, nombre: true, fotoUrl: true, club: { select: { nombre: true } } } },
      },
    });

    const usuario = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { perfilUso: true, regatistaId: true },
    });

    if (new URL(request.url).searchParams.get('solo') === 'ids') {
      return NextResponse.json({
        ids: favoritos.map((f) => f.regatista.id),
        perfilUso: usuario?.perfilUso ?? null,
        propio: usuario?.regatistaId ?? null,
      });
    }

    const ultimos = await ultimoResultadoDe(favoritos.map((f) => f.regatista.id));
    return NextResponse.json({
      perfilUso: usuario?.perfilUso ?? null,
      favoritos: favoritos.map((f) => ({
        id: f.regatista.id,
        nombre: f.regatista.nombre,
        fotoUrl: f.regatista.fotoUrl,
        club: f.regatista.club?.nombre ?? null,
        ultimo: ultimos.get(f.regatista.id) ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/favoritos');
  }
}

// Agrega un regatista a los favoritos de la cuenta. Es idempotente: agregar
// uno que ya está no da error.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { regatistaId } = bodySchema.parse(await request.json());

    const regatista = await prisma.regatista.findUnique({ where: { id: regatistaId }, select: { id: true, nombre: true } });
    if (!regatista) {
      return NextResponse.json({ error: 'Regatista no encontrado' }, { status: 404 });
    }

    const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { regatistaId: true } });
    if (usuario?.regatistaId === regatistaId) {
      return NextResponse.json({ error: 'Ese es tu propio perfil: ya lo tenés a mano en Mi perfil' }, { status: 400 });
    }

    const yaEsta = await prisma.favorito.findUnique({
      where: { userId_regatistaId: { userId: session.user.id, regatistaId } },
      select: { id: true },
    });
    if (yaEsta) return NextResponse.json({ ok: true }, { status: 200 });

    const total = await prisma.favorito.count({ where: { userId: session.user.id } });
    if (total >= MAX_FAVORITOS) {
      return NextResponse.json({ error: `Podés tener hasta ${MAX_FAVORITOS} favoritos` }, { status: 400 });
    }

    await prisma.favorito.create({ data: { userId: session.user.id, regatistaId } });
    void registrarAuditoria(actorDe(session), 'favorito.agregar', 'Regatista', regatistaId, { nombre: regatista.nombre });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/favoritos');
  }
}
