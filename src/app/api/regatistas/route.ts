import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { regatistaEditSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const clubId = searchParams.get('clubId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50));

    const where: any = {};
    if (q) {
      where.nombre = {
        contains: q,
        mode: 'insensitive',
      };
    }
    if (clubId) where.clubId = clubId;

    const [regatistas, total] = await Promise.all([
      prisma.regatista.findMany({
        where,
        include: { club: true },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.regatista.count({ where }),
    ]);

    return NextResponse.json({ regatistas, total, page, pageSize });
  } catch (error) {
    return handleApiError(error, 'GET /api/regatistas');
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = regatistaEditSchema.parse(json);

    let clubId: string | undefined;
    if (body.club && body.club.trim()) {
      const clubStr = body.club.trim().toUpperCase();
      const club = await prisma.club.upsert({
        where: { nombre: clubStr },
        update: {},
        create: { nombre: clubStr },
      });
      clubId = club.id;
    }

    const regatista = await prisma.regatista.create({
      data: { nombre: body.nombre, pais: body.pais, clubId },
      include: { club: true },
    });

    return NextResponse.json(regatista, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/regatistas');
  }
}
