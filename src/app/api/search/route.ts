import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";
import { permitir, ipDeRequest } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // Único endpoint público que pega contra la base con `contains` (más
  // costoso que un lookup por índice) sin ningún límite -a diferencia de
  // registro/login/contacto/forgot-password, que sí lo tienen. 30 por
  // minuto por IP alcanza de sobra para escribir un nombre a mano (el
  // buscador debouncea 300ms) sin habilitar scraping barato de la base.
  if (!(await permitir(`search:${ipDeRequest(request)}`, 30, 60 * 1000))) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en un momento.' }, { status: 429 });
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
