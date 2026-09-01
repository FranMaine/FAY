import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const clases = await prisma.clase.findMany({
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(clases);
  } catch (error) {
    console.error('Error fetching clases:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
