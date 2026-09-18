import { prisma } from '@/lib/db';

/**
 * Fusiona uno o más clubes "duplicado" dentro de un club "canónico": todo
 * regatista y campeonato (como sede) que apuntaba al duplicado pasa a
 * apuntar al canónico, y el duplicado se borra.
 *
 * A diferencia de fusionarRegatistas (src/lib/regatista-merge.ts), acá no
 * hace falta resolver colisiones de constraint único: Regatista.clubId y
 * Campeonato.sedeId son foreign keys simples sin @@unique que involucre a
 * clubId, así que mover todos los regatistas/campeonatos de golpe con
 * updateMany no puede chocar con nada.
 *
 * Mismo motivo que fusionarRegatistas para no usar prisma.$transaction()
 * interactivo: con Neon pooled, evitarlo es más simple que arriesgarse a
 * "Transaction not found" -acá alcanza con dos updateMany (idempotentes:
 * si se reintenta, ya no van a encontrar filas con ese clubId) más un
 * delete.
 */
export async function fusionarClubes(canonicoId: string, duplicadoIds: string[]) {
  if (duplicadoIds.includes(canonicoId)) {
    throw new Error('El club canónico no puede estar también en la lista de duplicados');
  }

  const canonico = await prisma.club.findUnique({ where: { id: canonicoId } });
  if (!canonico) throw new Error('Club canónico no encontrado');

  const resumen = { regatistasMovidos: 0, campeonatosMovidos: 0, duplicadosBorrados: 0 };

  for (const duplicadoId of duplicadoIds) {
    const duplicado = await prisma.club.findUnique({ where: { id: duplicadoId } });
    if (!duplicado) continue; // ya borrado o id inválido: seguimos con el resto

    const regatistas = await prisma.regatista.updateMany({
      where: { clubId: duplicadoId },
      data: { clubId: canonicoId },
    });
    resumen.regatistasMovidos += regatistas.count;

    // Regatistas de doble club: el duplicado pasa a ser el canónico (sin
    // repetirlo si ya es su club principal o ya lo tenían).
    const secundarios = await prisma.regatista.findMany({
      where: { otrosClubes: { some: { id: duplicadoId } } },
      select: { id: true, clubId: true },
    });
    for (const sec of secundarios) {
      await prisma.regatista.update({
        where: { id: sec.id },
        data: {
          otrosClubes: {
            disconnect: [{ id: duplicadoId }],
            ...(sec.clubId !== canonicoId ? { connect: [{ id: canonicoId }] } : {}),
          },
        },
      });
    }
    // Quien ahora tiene al canónico como principal no lo necesita repetido en el secundario.
    const redundantes = await prisma.regatista.findMany({
      where: { clubId: canonicoId, otrosClubes: { some: { id: canonicoId } } },
      select: { id: true },
    });
    for (const r of redundantes) {
      await prisma.regatista.update({ where: { id: r.id }, data: { otrosClubes: { disconnect: [{ id: canonicoId }] } } });
    }

    // Conserva el escudo y el nombre completo del duplicado si el canónico no tiene.
    if ((!canonico.logoUrl && duplicado.logoUrl) || (!canonico.nombreCompleto && duplicado.nombreCompleto)) {
      await prisma.club.update({
        where: { id: canonicoId },
        data: {
          ...(!canonico.logoUrl && duplicado.logoUrl ? { logoUrl: duplicado.logoUrl } : {}),
          ...(!canonico.nombreCompleto && duplicado.nombreCompleto ? { nombreCompleto: duplicado.nombreCompleto } : {}),
        },
      });
    }

    const campeonatos = await prisma.campeonato.updateMany({
      where: { sedeId: duplicadoId },
      data: { sedeId: canonicoId },
    });
    resumen.campeonatosMovidos += campeonatos.count;

    await prisma.club.delete({ where: { id: duplicadoId } });
    resumen.duplicadosBorrados++;
  }

  return resumen;
}
