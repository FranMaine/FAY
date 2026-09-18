import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

interface ActorAuditoria {
  email: string;
  name?: string | null;
}

/**
 * Registro de auditoría de acciones administrativas sensibles (ver
 * AuditLog en el schema). Al igual que registrarError() en api-error.ts,
 * nunca debe poder tirar abajo la acción que la disparó -si guardar el
 * registro falla, se loguea a consola y se sigue.
 */
export async function registrarAuditoria(
  actor: ActorAuditoria,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  detalle?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorEmail: actor.email,
        actorNombre: actor.name || null,
        accion,
        entidad,
        entidadId: entidadId || null,
        detalle: (detalle as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (error) {
    console.error('[auditoria] Error registrando acción:', error);
  }
}
