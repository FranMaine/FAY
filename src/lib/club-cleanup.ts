import { prisma } from '@/lib/db';
import { registrarAuditoria, type ActorAuditoria } from '@/lib/auditoria';

/**
 * Borra los clubes de la lista que hayan quedado sin NINGÚN regatista (ni
 * como club principal ni como "otro club" secundario) -pensado para
 * llamarse después de una operación que pudo vaciar un club (reasignar el
 * club de un regatista, fusionar regatistas duplicados), así un club
 * fantasma no queda dando vueltas para siempre en los selectores de
 * club. La fusión de clubes (fusionarClubes en club-merge.ts) ya borra el
 * duplicado explícitamente, no necesita pasar por acá.
 *
 * No borra un club que todavía sea sede de algún campeonato, aunque no
 * tenga regatistas propios: esa referencia es real (el club organizó o
 * alojó la regata) y borrarlo blanquearía la sede de esos campeonatos sin
 * que nadie lo haya pedido.
 *
 * `actor` es opcional -si no se pasa (ej: un script de mantenimiento sin
 * sesión real), borra igual pero sin dejar registro de auditoría.
 */
export async function eliminarClubesVacios(
  clubIds: (string | null | undefined)[],
  actor?: ActorAuditoria
): Promise<string[]> {
  const ids = [...new Set(clubIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return [];

  const borrados: string[] = [];
  for (const id of ids) {
    const club = await prisma.club.findUnique({
      where: { id },
      select: {
        nombre: true,
        _count: { select: { regatistas: true, regatistasSecundarios: true, campeonatos: true } },
      },
    });
    if (!club) continue; // ya no existe (ej: dos reasignaciones seguidas al mismo club vacío)
    if (club._count.regatistas > 0 || club._count.regatistasSecundarios > 0) continue;
    if (club._count.campeonatos > 0) continue; // sigue siendo sede de algo

    try {
      await prisma.club.delete({ where: { id } });
    } catch {
      continue; // lo borró otra request en simultáneo, o quedó referenciado por otra tabla -no es crítico
    }
    borrados.push(id);
    if (actor) {
      void registrarAuditoria(actor, 'club.auto_eliminar_vacio', 'Club', id, { nombre: club.nombre });
    }
  }
  return borrados;
}
