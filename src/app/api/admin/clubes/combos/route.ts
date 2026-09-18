import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';

// La sigla "CNP" es un caso especial encontrado a mano durante la limpieza
// de datos de clubes (ver el commit de la sección Clubes): la base tiene
// DOS nombres completos distintos para la misma sigla -"Club Náutico
// Paraná" y "Cofradía Náutica del Pacífico"- sin forma de saber cuál le
// corresponde de verdad al club "CNP" (36 regatistas) sin más información.
// No se puede detectar en código de forma genérica (no hay otro caso
// igual en la base), así que queda hardcodeado acá -si en el futuro
// aparece un caso similar, hay que agregarlo a mano.
const SIGLA_AMBIGUA = 'CNP';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const clubes = await prisma.club.findMany({
      include: {
        regatistas: { select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } },
      },
    });
    const porNombre = new Map(clubes.map((c) => [c.nombre.trim().toUpperCase(), c]));

    // Clubes "combo": el nombre junta varias siglas reales con "/" o "|"
    // -no se puede saber a cuál de las varias pertenece cada regatista sin
    // revisar campeonato por campeonato, así que se muestran para que un
    // admin decida uno por uno en vez de fusionar/reasignar a ciegas.
    const combos = clubes
      .filter((c) => /[/|-]/.test(c.nombre) && c.regatistas.length > 0)
      .map((c) => {
        const tokens = c.nombre.split(/[/|-]/).map((t) => t.trim()).filter(Boolean);
        const candidatos = tokens
          .map((t) => porNombre.get(t.toUpperCase()))
          .filter((c): c is NonNullable<typeof c> => !!c && c.regatistas !== undefined)
          .map((c) => ({ id: c.id, nombre: c.nombre }));
        // Partes del nombre que no coinciden con ningún club existente: se
        // ofrecen para crearlas como club nuevo.
        const nuevos = tokens.filter((t) => !porNombre.has(t.toUpperCase()));
        return {
          id: c.id,
          nombre: c.nombre,
          regatistas: c.regatistas,
          candidatos,
          nuevos,
        };
      });

    const clubesCnp = clubes
      .filter((c) => c.nombre.trim().toUpperCase() === SIGLA_AMBIGUA || c.nombre.trim().toUpperCase().startsWith(`${SIGLA_AMBIGUA} -`))
      .map((c) => ({ id: c.id, nombre: c.nombre, regatistas: c.regatistas }));

    return NextResponse.json({ combos, siglaAmbigua: SIGLA_AMBIGUA, clubesCnp });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/clubes/combos');
  }
}
