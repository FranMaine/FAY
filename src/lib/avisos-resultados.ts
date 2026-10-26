import { prisma } from '@/lib/db';
import { registrarAuditoria } from '@/lib/auditoria';
import { sendEmail, emailResultadoPublicado } from '@/lib/email';
import { posicionesFinales } from '@/lib/posiciones-campeonato';
import { SITE_URL } from '@/lib/site';

const ACCION_AVISO = 'campeonato.avisar_regatistas';

// Tope de mails por publicación: protege la cuota del proveedor de mail (el
// plan gratuito de Resend tiene un límite diario) si algún día un campeonato
// llegara a tener muchísimas cuentas vinculadas.
const MAXIMO_AVISOS = 200;

/**
 * Cuando se publica un campeonato, avisa por mail a cada persona con la
 * cuenta vinculada (y el mail verificado, y que no se dio de baja) a un regatista que figura en él,
 * con la posición final que le tocó.
 *
 * Se manda UNA sola vez por campeonato: antes de mandar, deja un registro en
 * la auditoría, y si ya existe uno no hace nada -así despublicar y volver a
 * publicar (algo habitual al corregir un resultado) no vuelve a llenar las
 * casillas. Es "como mucho una vez": si el servidor se corta a mitad de
 * camino, no se reintenta solo.
 */
export async function avisarResultadosPublicados(campeonatoId: string): Promise<{ enviados: number }> {
  try {
    const yaAvisado = await prisma.auditLog.findFirst({
      where: { accion: ACCION_AVISO, entidadId: campeonatoId },
      select: { id: true },
    });
    if (yaAvisado) return { enviados: 0 };

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

    const usuarios = await prisma.user.findMany({
      where: { regatistaId: { in: [...posicionDe.keys()] }, emailVerified: { not: null }, notificarResultados: true },
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
          regatistaId: { in: [...posicionDe.keys()] },
          user: { emailVerified: { not: null }, notificarResultados: true },
        },
        select: { regatistaId: true, user: { select: { email: true } }, regatista: { select: { nombre: true } } },
        take: MAXIMO_AVISOS,
      })
    ).filter((f) => !yaAvisados.has(`${f.user.email}|${f.regatistaId}`));

    // Se deja el registro ANTES de mandar (ver arriba): "como mucho una vez".
    await registrarAuditoria({ email: 'sistema', name: 'Avisos automáticos' }, ACCION_AVISO, 'Campeonato', campeonatoId, {
      nombre: campeonato.nombre,
      destinatarios: usuarios.length + seguidores.length,
    });

    for (const u of usuarios) {
      if (!u.regatistaId || !u.regatista) continue;
      await sendEmail({
        to: u.email,
        ...emailResultadoPublicado({
          nombreRegatista: u.regatista.nombre,
          campeonato: campeonato.nombre,
          clase: campeonato.clase.nombre,
          anio: campeonato.anio,
          posicion: posicionDe.get(u.regatistaId) ?? null,
          totalParticipantes,
          urlCampeonato: `${SITE_URL}/campeonatos/${campeonato.id}`,
          urlConfiguracion: `${SITE_URL}/mi-perfil/configuracion`,
        }),
      });
    }
    for (const f of seguidores) {
      await sendEmail({
        to: f.user.email,
        ...emailResultadoPublicado({
          nombreRegatista: f.regatista.nombre,
          campeonato: campeonato.nombre,
          clase: campeonato.clase.nombre,
          anio: campeonato.anio,
          posicion: posicionDe.get(f.regatistaId) ?? null,
          totalParticipantes,
          urlCampeonato: `${SITE_URL}/campeonatos/${campeonato.id}`,
          urlConfiguracion: `${SITE_URL}/mi-perfil/configuracion`,
          favorito: true,
        }),
      });
    }
    return { enviados: usuarios.length + seguidores.length };
  } catch (error) {
    // Un fallo acá no debe afectar a la publicación, que ya se hizo.
    console.error(`[avisos] No se pudieron mandar los avisos del campeonato ${campeonatoId}:`, error);
    return { enviados: 0 };
  }
}
