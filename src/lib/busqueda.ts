import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { palabrasDeBusqueda, patronSinTildes } from '@/lib/busqueda-texto';

// Búsqueda de regatistas en la base: ver busqueda-texto.ts para las reglas
// (sin mayúsculas, tildes ni orden de palabras).

/**
 * Ids de los regatistas cuyo nombre contiene TODAS las palabras buscadas (o
 * cuyo club coincide con lo escrito), en cualquier orden y sin importar
 * tildes ni mayúsculas. Devuelve solo ids para que cada endpoint arme su
 * consulta (include, paginado, orden) con Prisma como siempre.
 */
export async function idsDeRegatistasPorNombre(busqueda: string): Promise<string[]> {
  const palabras = palabrasDeBusqueda(busqueda);
  if (palabras.length === 0) return [];

  const porNombre = Prisma.join(
    palabras.map((p) => Prisma.sql`r."nombre" ~* ${patronSinTildes(p)}`),
    ' AND '
  );
  const porClub = Prisma.sql`c."nombre" ~* ${patronSinTildes(busqueda.trim())}`;

  const filas = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT r."id" FROM "Regatista" r
    LEFT JOIN "Club" c ON c."id" = r."clubId"
    WHERE (${porNombre}) OR (${porClub})
  `);
  return filas.map((f) => f.id);
}
