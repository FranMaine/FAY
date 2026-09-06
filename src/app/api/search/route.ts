import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Buscamos por PALABRA, no por substring completo: cada palabra
    // escrita tiene que aparecer en el nombre, pero en cualquier orden -así
    // "Tomas Maine" y "Maine Tomas" encuentran a la misma persona, en vez
    // de depender de que el usuario escriba el nombre en el mismo orden
    // exacto en que está guardado.
    const palabras = q.trim().split(/\s+/).filter(Boolean);

    const regatistas = await prisma.regatista.findMany({
      where: {
        OR: [
          { AND: palabras.map((palabra) => ({ nombre: { contains: palabra, mode: 'insensitive' as const } })) },
          { club: { nombre: { contains: q, mode: 'insensitive' } } }
        ]
      },
      include: {
        club: true,
      },
      take: 5,
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json(regatistas);
  } catch (error) {
    return handleApiError(error, 'GET /api/search');
  }
}
