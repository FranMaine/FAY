import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const clases = await prisma.clase.findMany({
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(clases);
  } catch (error) {
    return handleApiError(error, 'GET /api/clases');
  }
}
