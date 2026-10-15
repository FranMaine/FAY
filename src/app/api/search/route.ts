import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";
import { permitir, ipDeRequest } from "@/lib/rate-limit";
import { idsDeRegatistasPorNombre } from "@/lib/busqueda";

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
    // escrita tiene que aparecer en el nombre, en cualquier orden y sin
    // importar mayúsculas ni tildes -así "maria maine" y "Maine, María"
    // encuentran a la misma persona (ver lib/busqueda.ts).
    const ids = await idsDeRegatistasPorNombre(q);

    const regatistas = await prisma.regatista.findMany({
      where: { id: { in: ids } },
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
