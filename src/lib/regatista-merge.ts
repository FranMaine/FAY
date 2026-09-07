import { prisma } from '@/lib/db';
import { normalizarNombre } from '@/lib/nombres';

/**
 * Fusiona uno o más regatistas "duplicado" dentro de un regatista
 * "canónico": todo su historial pasa a quedar bajo un solo id en vez de
 * repartido en varias fichas de la misma persona real (el motivo típico:
 * la misma persona importada dos veces con el nombre escrito distinto, o
 * -antes de un fix- con un salto de línea pegado adentro del nombre).
 *
 * Reglas para cada duplicado:
 *  - Resultado: se mueve al canónico. Si el canónico YA tiene un resultado
 *    para esa misma regata (choque del unique [regataId, regatistaId] -dos
 *    fichas de la "misma persona" que por error tienen cada una un
 *    resultado en la misma regata), se conserva el del canónico y se
 *    descarta el del duplicado en vez de fallar la fusión entera.
 *  - SolicitudVinculacion: igual criterio -se mueve, salvo que el canónico
 *    ya tenga una solicitud del mismo usuario, en cuyo caso se descarta la
 *    del duplicado.
 *  - User.regatistaId: se reapunta al canónico, salvo que el canónico ya
 *    esté vinculado a OTRO usuario -en ese caso se desvincula al usuario
 *    del duplicado (mejor eso que dejar dos usuarios apuntando al mismo
 *    regatista, cosa que el @unique de la columna no permite).
 *  - Si el duplicado tiene club y el canónico no, el canónico se queda con
 *    el club del duplicado en vez de perder ese dato.
 */
export async function fusionarRegatistas(canonicoId: string, duplicadoIds: string[]) {
  if (duplicadoIds.includes(canonicoId)) {
    throw new Error('El regatista canónico no puede estar también en la lista de duplicados');
  }

  const resumen = {
    resultadosMovidos: 0,
    resultadosDescartados: 0,
    solicitudesMovidas: 0,
    solicitudesDescartadas: 0,
    usuariosDesvinculados: 0,
    duplicadosBorrados: 0,
  };

  await prisma.$transaction(async (tx) => {
    let canonico = await tx.regatista.findUnique({ where: { id: canonicoId } });
    if (!canonico) throw new Error('Regatista canónico no encontrado');

    for (const duplicadoId of duplicadoIds) {
      const duplicado = await tx.regatista.findUnique({ where: { id: duplicadoId } });
      if (!duplicado) continue; // ya borrado o id inválido: seguimos con el resto

      if (!canonico.clubId && duplicado.clubId) {
        canonico = await tx.regatista.update({ where: { id: canonicoId }, data: { clubId: duplicado.clubId } });
      }

      const resultadosDuplicado = await tx.resultado.findMany({ where: { regatistaId: duplicadoId } });
      for (const r of resultadosDuplicado) {
        const yaExiste = await tx.resultado.findUnique({
          where: { regataId_regatistaId: { regataId: r.regataId, regatistaId: canonicoId } },
        });
        if (yaExiste) {
          await tx.resultado.delete({ where: { id: r.id } });
          resumen.resultadosDescartados++;
        } else {
          await tx.resultado.update({ where: { id: r.id }, data: { regatistaId: canonicoId } });
          resumen.resultadosMovidos++;
        }
      }

      const solicitudesDuplicado = await tx.solicitudVinculacion.findMany({ where: { regatistaId: duplicadoId } });
      for (const s of solicitudesDuplicado) {
        const yaExiste = await tx.solicitudVinculacion.findUnique({
          where: { userId_regatistaId: { userId: s.userId, regatistaId: canonicoId } },
        });
        if (yaExiste) {
          await tx.solicitudVinculacion.delete({ where: { id: s.id } });
          resumen.solicitudesDescartadas++;
        } else {
          await tx.solicitudVinculacion.update({ where: { id: s.id }, data: { regatistaId: canonicoId } });
          resumen.solicitudesMovidas++;
        }
      }

      const usuarioVinculado = await tx.user.findUnique({ where: { regatistaId: duplicadoId } });
      if (usuarioVinculado) {
        const canonicoYaVinculado = await tx.user.findUnique({ where: { regatistaId: canonicoId } });
        if (canonicoYaVinculado) {
          await tx.user.update({ where: { id: usuarioVinculado.id }, data: { regatistaId: null } });
          resumen.usuariosDesvinculados++;
        } else {
          await tx.user.update({ where: { id: usuarioVinculado.id }, data: { regatistaId: canonicoId } });
        }
      }

      await tx.regatista.delete({ where: { id: duplicadoId } });
      resumen.duplicadosBorrados++;
    }
  });

  return resumen;
}

export interface GrupoDuplicado {
  nombreNormalizado: string;
  regatistas: {
    id: string;
    nombre: string;
    club: string | null;
    resultadosCount: number;
    createdAt: Date;
  }[];
}

/** Agrupa los regatistas cuyo nombre normalizado coincide -candidatos a
 * fusionar. No incluye a nadie que ya sea el único con ese nombre. */
export async function buscarRegatistasDuplicados(): Promise<GrupoDuplicado[]> {
  const regatistas = await prisma.regatista.findMany({
    include: { club: true, _count: { select: { resultados: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const grupos = new Map<string, GrupoDuplicado>();
  for (const r of regatistas) {
    const clave = normalizarNombre(r.nombre);
    if (!grupos.has(clave)) grupos.set(clave, { nombreNormalizado: clave, regatistas: [] });
    grupos.get(clave)!.regatistas.push({
      id: r.id,
      nombre: r.nombre,
      club: r.club?.nombre ?? null,
      resultadosCount: r._count.resultados,
      createdAt: r.createdAt,
    });
  }

  return [...grupos.values()].filter((g) => g.regatistas.length > 1);
}
