import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { regatistaSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const clubId = searchParams.get('clubId');

    const where: any = {};
    if (q) {
      where.nombre = {
        contains: q,
        mode: 'insensitive',
      };
    }
    if (clubId) where.clubId = clubId;

    const regatistas = await prisma.regatista.findMany({
      where,
      include: {
        club: true,
      },
      take: 50,
    });

    return NextResponse.json(regatistas);
  } catch (error) {
    console.error('Error fetching regatistas:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const body = regatistaSchema.parse(json);

    const regatista = await prisma.regatista.create({
      data: body,
    });

    return NextResponse.json(regatista, { status: 201 });
  } catch (error) {
    console.error('Error creating regatista:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
