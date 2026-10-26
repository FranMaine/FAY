import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { registrarAuditoria } from '@/lib/auditoria';
import { sendEmail, emailResultadoPublicado, emailResultadoActualizado } from '@/lib/email';
import { posicionesFinales } from '@/lib/posiciones-campeonato';
import { SITE_URL } from '@/lib/site';

const ACCION_AVISO = 'campeonato.avisar_regatistas';

// Tope de mails por aviso: protege la cuota del proveedor de mail (el plan
// gratuito de Resend tiene un límite diario) si algún día un campeonato
// llegara a tener muchísimas cuentas vinculadas.
const MAXIMO_AVISOS = 200;

// Cómo quedó cada regatista la última vez que se avisó: [posición final, huella
// de sus resultados]. Es lo que permite detectar después si algo le cambió.
type Foto = Record<string, [number | null, string]>;

function huella(resultados: { numero: number; puesto: number | null; puntos: number | null; observacion: string | null }[]): string {
  const texto = resultados
    .sort((a, b) => a.numero - b.numero)
    .map((r) => `${r.numero}:${r.puesto ?? ''}:${r.puntos ?? ''}:${r.observacion ?? ''}`)
    .join('|');
  return createHash('sha1').update(texto).digest('hex').slice(0, 10);
}

function leerFoto(detalle: unknown): Foto | null {
  const posiciones = (detalle as { posiciones?: unknown } | null)?.posiciones;
  return posiciones && typeof posiciones === 'object' ? (posiciones as Foto) : null;
}

/**
 * Avisa por mail de los resultados de un campeonato PUBLICADO a las cuentas
 * vinculadas a quienes figuran en él y a quienes los tienen en favoritos (con
 * el mail verificado y sin haberse dado de baja de los avisos).
 *
 * - La primera vez (al publicar) le manda a cada uno su posición final.
 * - Las veces siguientes (se corrigió una regata, se cambiaron los descartes,
 *   se volvió a importar...) solo avisa a quienes les cambió alguna posición o
 *   resultado, comparando con cómo estaban la última vez que se avisó. Si no
 *   cambió nada para nadie, no manda nada: se puede llamar después de cada
 *   edición sin llenar las casillas.
 *
 * Antes de mandar deja un registro en la auditoría con cómo quedó cada uno:
 * es "como mucho una vez" por cambio (si el servidor se corta a mitad de
 * camino, no se reintenta solo) y es la base de la comparación de la próxima.
 */
export async function avisarResultadosPublicados(campeonatoId: string): Promise<{ enviados: number }> {
  try {
    const previo = await prisma.auditLog.findFirst({
      where: { accion: ACCION_AVISO, entidadId: campeonatoId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, detalle: true },
    });

    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      include: {
        clase: true,
        regatas: {
          include: { resultados: { include: { regatista: { include: { club: true } } } } },
          orderBy: { numero: 'asc' },
        },
      },
    });
    if (!campeonato || campeonato.estado !== 'PUBLICADO') return { enviados: 0 };

    // Misma clasificación que muestra la página del campeonato.
    const { posicionDe, total: totalParticipantes } = posicionesFinales(campeonato);

    const resultadosDe = new Map<string, { numero: number; puesto: number | null; puntos: number | null; observacion: string | null }[]>();
    for (const regata of campeonato.regatas) {
      for (const r of regata.resultados) {
        const lista = resultadosDe.get(r.regatistaId) ?? [];
        lista.push({ numero: regata.numero, puesto: r.puesto, puntos: r.puntos, observacion: r.observacion });
        resultadosDe.set(r.regatistaId, lista);
      }
    }
    const fotoActual: Foto = {};
    for (const id of posicionDe.keys()) fotoActual[id] = [posicionDe.get(id) ?? null, huella(resultadosDe.get(id) ?? [])];

    const sistema = { email: 'sistema', name: 'Avisos automáticos' };
    const fotoPrevia = previo ? leerFoto(previo.detalle) : null;

    // Se había avisado antes de que se guardara cómo quedó cada uno: no hay
    // con qué comparar. Se deja esta foto como punto de partida, sin mandar nada.
    if (previo && !fotoPrevia) {
      await registrarAuditoria(sistema, ACCION_AVISO, 'Campeonato', campeonatoId, {
        nombre: campeonato.nombre,
        destinatarios: 0,
        tipo: 'punto_de_partida',
        posiciones: fotoActual as unknown as Prisma.InputJsonValue,
      });
      return { enviados: 0 };
    }

    // A quién avisar: todos la primera vez; después, solo a quienes cambió algo.
    const aAvisar = Object.keys(fotoActual).filter((id) => {
      if (!fotoPrevia) return true;
      const antes = fotoPrevia[id];
      return !antes || antes[0] !== fotoActual[id][0] || antes[1] !== fotoActual[id][1];
    });
    if (aAvisar.length === 0) return { enviados: 0 };

    const usuarios = await prisma.user.findMany({
      where: { regatistaId: { in: aAvisar }, emailVerified: { not: null }, notificarResultados: true },
      select: { email: true, regatistaId: true, regatista: { select: { nombre: true } } },
      take: MAXIMO_AVISOS,
    });

    // Quienes tienen a un regatista de este campeonato en favoritos (ver
    // lib/favoritos.ts). Si además es su propio perfil vinculado, ya recibe el
    // aviso de arriba: no se le manda dos veces lo mismo.
    const yaAvisados = new Set(usuarios.map((u) => `${u.email}|${u.regatistaId}`));
    const seguidores = (
      await prisma.favorito.findMany({
        where: {
          regatistaId: { in: aAvisar },
          user: { emailVerified: { not: null }, notificarFavoritos: true },
        },
        select: { regatistaId: true, user: { select: { email: true } }, regatista: { select: { nombre: true } } },
        take: MAXIMO_AVISOS,
      })
    ).filter((f) => !yaAvisados.has(`${f.user.email}|${f.regatistaId}`));

    // Se deja el registro ANTES de mandar (ver arriba): "como mucho una vez".
    await registrarAuditoria(sistema, ACCION_AVISO, 'Campeonato', campeonatoId, {
      nombre: campeonato.nombre,
      destinatarios: usuarios.length + seguidores.length,
      tipo: fotoPrevia ? 'actualizacion' : 'publicacion',
      posiciones: fotoActual as unknown as Prisma.InputJsonValue,
    });

    const base = {
      campeonato: campeonato.nombre,
      clase: campeonato.clase.nombre,
      anio: campeonato.anio,
      totalParticipantes,
      urlCampeonato: `${SITE_URL}/campeonatos/${campeonato.id}`,
      urlConfiguracion: `${SITE_URL}/mi-perfil/configuracion`,
    };
    const mailDe = (regatistaId: string, nombreRegatista: string, favorito: boolean) => {
      const datos = { ...base, nombreRegatista, posicion: posicionDe.get(regatistaId) ?? null, favorito };
      return fotoPrevia
        ? emailResultadoActualizado({ ...datos, posicionAnterior: fotoPrevia[regatistaId]?.[0] ?? null })
        : emailResultadoPublicado(datos);
    };

    for (const u of usuarios) {
      if (!u.regatistaId || !u.regatista) continue;
      await sendEmail({ to: u.email, ...mailDe(u.regatistaId, u.regatista.nombre, false) });
    }
    for (const f of seguidores) {
      await sendEmail({ to: f.user.email, ...mailDe(f.regatistaId, f.regatista.nombre, true) });
    }
    return { enviados: usuarios.length + seguidores.length };
  } catch (error) {
    // Un fallo acá no debe afectar a la edición, que ya se hizo.
    console.error(`[avisos] No se pudieron mandar los avisos del campeonato ${campeonatoId}:`, error);
    return { enviados: 0 };
  }
}
