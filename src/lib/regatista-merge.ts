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
 *
 * OJO: a propósito NO corre adentro de un prisma.$transaction()
 * interactivo. Con un duplicado que tiene varias decenas de resultados,
 * una transacción interactiva (un find+update/delete por resultado, más
 * lo de solicitudes/usuario) hace demasiados round-trips seguidos sobre
 * la conexión pooleada de Neon -el pooler la recicla antes de que
 * termine y Prisma tira "Transaction not found" a mitad de camino
 * (comprobado). Mismo motivo por el que import-service.ts tampoco usa
 * una. En cambio, cada paso de acá abajo es idempotente por sí solo (el
 * resultado en cuestión ya no tiene regatistaId=duplicadoId una vez
 * movido, así que un find posterior no lo vuelve a encontrar) -si esto
 * se corta a mitad de camino, llamar a fusionarRegatistas de nuevo con
 * los mismos ids retoma donde quedó sin duplicar ni perder nada.
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

  let canonico = await prisma.regatista.findUnique({ where: { id: canonicoId } });
  if (!canonico) throw new Error('Regatista canónico no encontrado');

  for (const duplicadoId of duplicadoIds) {
    const duplicado = await prisma.regatista.findUnique({ where: { id: duplicadoId } });
    if (!duplicado) continue; // ya borrado o id inválido: seguimos con el resto

    if (!canonico.clubId && duplicado.clubId) {
      canonico = await prisma.regatista.update({ where: { id: canonicoId }, data: { clubId: duplicado.clubId } });
    }

    // Doble club: se suman los clubes del duplicado (principal y secundarios)
    // a los del canónico, sin repetir.
    const conClubes = await prisma.regatista.findMany({
      where: { id: { in: [canonicoId, duplicadoId] } },
      select: { id: true, clubId: true, otrosClubes: { select: { id: true } } },
    });
    const can = conClubes.find((x) => x.id === canonicoId);
    const dup = conClubes.find((x) => x.id === duplicadoId);
    if (can && dup) {
      const ya = new Set([can.clubId, ...can.otrosClubes.map((c) => c.id)].filter(Boolean) as string[]);
      const nuevos = [dup.clubId, ...dup.otrosClubes.map((c) => c.id)].filter((id): id is string => !!id && !ya.has(id));
      if (nuevos.length) {
        await prisma.regatista.update({ where: { id: canonicoId }, data: { otrosClubes: { connect: nuevos.map((id) => ({ id })) } } });
      }
    }

    const resultadosDuplicado = await prisma.resultado.findMany({ where: { regatistaId: duplicadoId } });
    for (const r of resultadosDuplicado) {
      const yaExiste = await prisma.resultado.findUnique({
        where: { regataId_regatistaId: { regataId: r.regataId, regatistaId: canonicoId } },
      });
      if (yaExiste) {
        await prisma.resultado.delete({ where: { id: r.id } });
        resumen.resultadosDescartados++;
      } else {
        await prisma.resultado.update({ where: { id: r.id }, data: { regatistaId: canonicoId } });
        resumen.resultadosMovidos++;
      }
    }

    const solicitudesDuplicado = await prisma.solicitudVinculacion.findMany({ where: { regatistaId: duplicadoId } });
    for (const s of solicitudesDuplicado) {
      const yaExiste = await prisma.solicitudVinculacion.findUnique({
        where: { userId_regatistaId: { userId: s.userId, regatistaId: canonicoId } },
      });
      if (yaExiste) {
        await prisma.solicitudVinculacion.delete({ where: { id: s.id } });
        resumen.solicitudesDescartadas++;
      } else {
        await prisma.solicitudVinculacion.update({ where: { id: s.id }, data: { regatistaId: canonicoId } });
        resumen.solicitudesMovidas++;
      }
    }

    const usuarioVinculado = await prisma.user.findUnique({ where: { regatistaId: duplicadoId } });
    if (usuarioVinculado) {
      const canonicoYaVinculado = await prisma.user.findUnique({ where: { regatistaId: canonicoId } });
      if (canonicoYaVinculado) {
        await prisma.user.update({ where: { id: usuarioVinculado.id }, data: { regatistaId: null } });
        resumen.usuariosDesvinculados++;
      } else {
        await prisma.user.update({ where: { id: usuarioVinculado.id }, data: { regatistaId: canonicoId } });
      }
    }

    await prisma.regatista.delete({ where: { id: duplicadoId } });
    resumen.duplicadosBorrados++;
  }

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

export interface RegatistaInfo {
  id: string;
  nombre: string;
  club: string | null;
  resultadosCount: number;
  createdAt: Date;
}

export interface CandidatoApellidoSuelto {
  suelto: RegatistaInfo;
  candidatos: RegatistaInfo[];
}

/**
 * Detecta regatistas cuyo nombre es UNA sola palabra (típico de un
 * campeonato que solo traía el apellido en vez del nombre completo -ver
 * scripts/audit-db.ts) y que esa palabra aparece dentro del nombre de
 * otro regatista de nombre completo -candidatos a ser la misma persona
 * cargada aparte por error.
 *
 * A diferencia de buscarRegatistasDuplicados (nombre normalizado
 * IDÉNTICO: ahí no hay ambigüedad, todos son la misma persona y se
 * fusionan entre sí), acá puede haber VARIOS candidatos plausibles para
 * el mismo apellido suelto -personas reales distintas que comparten
 * apellido (ej: "DIAZ" podría ser cualquiera de 9 "Fulano Diaz"
 * distintos). Por eso NO se agrupan para fusionar en bloque -eso uniría
 * por error a esas personas distintas entre sí-, sino que se devuelve la
 * lista completa de candidatos para que un humano elija cuál (o ninguno)
 * es la persona correcta antes de fusionar.
 */
export async function buscarCandidatosApellidoSuelto(): Promise<CandidatoApellidoSuelto[]> {
  const regatistas = await prisma.regatista.findMany({
    include: { club: true, _count: { select: { resultados: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const toInfo = (r: (typeof regatistas)[number]): RegatistaInfo => ({
    id: r.id,
    nombre: r.nombre,
    club: r.club?.nombre ?? null,
    resultadosCount: r._count.resultados,
    createdAt: r.createdAt,
  });

  const tokensDe = (nombre: string) => normalizarNombre(nombre).split(' ').filter(Boolean);

  const porToken = new Map<string, typeof regatistas>();
  for (const r of regatistas) {
    for (const t of tokensDe(r.nombre)) {
      if (!porToken.has(t)) porToken.set(t, []);
      porToken.get(t)!.push(r);
    }
  }

  const resultado: CandidatoApellidoSuelto[] = [];
  for (const r of regatistas) {
    const tokensR = tokensDe(r.nombre);
    if (tokensR.length !== 1) continue; // solo nos interesan los de una sola palabra

    const candidatos = (porToken.get(tokensR[0]) || []).filter(
      (o) => o.id !== r.id && tokensDe(o.nombre).length > 1
    );
    if (candidatos.length > 0) {
      resultado.push({ suelto: toInfo(r), candidatos: candidatos.map(toInfo) });
    }
  }
  return resultado;
}

// Distancia de edición (Levenshtein) entre dos strings cortos -acá solo se
// usa sobre palabras individuales de un nombre (no sobre el nombre entero),
// así que el costo O(n*m) es insignificante.
function distanciaEdicion(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = fila[j];
      fila[j] = a[i - 1] === b[j - 1] ? anterior : 1 + Math.min(anterior, fila[j], fila[j - 1]);
      anterior = temp;
    }
  }
  return fila[b.length];
}

export interface ParDuplicadoSimilar {
  clave: string;
  a: RegatistaInfo;
  b: RegatistaInfo;
}

/**
 * Compara dos nombres COMPLETOS (2+ palabras cada uno) palabra por palabra
 * y dice si son "casi el mismo nombre" -pensada para nombres que
 * normalizarNombre() NO junta (no son idénticos) pero que probablemente
 * sean la misma persona: le falta o le sobra una palabra a uno respecto
 * del otro (ej: "Sofía Mainero" / "Sofía Valentina Mainero"), o una
 * palabra está mal tipeada (ej: "Mainero" / "Maynero", algo que puede
 * pasar al tipear a mano un resultado o al leer un PDF escaneado).
 *
 * Regla, pensada para evitar el falso positivo más obvio (dos personas
 * DISTINTAS que comparten apellido, ej. "Juan Perez" / "Pedro Perez"): se
 * hace un emparejamiento de palabras entre los dos nombres (iguales o a
 * distancia de edición 1) y se exige que la SUMA de palabras sin pareja
 * de ambos lados sea como mucho 1. Dos "Perez" con nombre de pila
 * distinto tienen 1 palabra sin pareja de cada lado (suma 2) y quedan
 * afuera; a "Sofía Mainero" le sobra o le falta una sola palabra respecto
 * de la otra variante (suma como mucho 1) y sí cuenta como parecido.
 */
export function sonNombresParecidos(nombreA: string, nombreB: string): boolean {
  const tokensDe = (nombre: string) => normalizarNombre(nombre).split(' ').filter(Boolean);
  const tokensA = tokensDe(nombreA);
  const tokensB = tokensDe(nombreB);
  if (tokensA.length < 2 || tokensB.length < 2) return false;
  if (normalizarNombre(nombreA) === normalizarNombre(nombreB)) return false; // idénticos: no es este caso

  const restantesB = [...tokensB];
  let sinPareja = 0;
  for (const t of tokensA) {
    const idx = restantesB.findIndex((p) => p === t || distanciaEdicion(t, p) <= 1);
    if (idx === -1) sinPareja++;
    else restantesB.splice(idx, 1);
  }
  sinPareja += restantesB.length; // palabras de B que quedaron sin usar

  return sinPareja <= 1;
}

/**
 * Detecta pares de regatistas de nombre completo (a diferencia de
 * buscarCandidatosApellidoSuelto, que busca nombres de una sola palabra)
 * que sonNombresParecidos() considera casi el mismo nombre -ver ahí la
 * regla exacta.
 */
export async function buscarCandidatosNombreSimilar(): Promise<ParDuplicadoSimilar[]> {
  const regatistas = await prisma.regatista.findMany({
    include: { club: true, _count: { select: { resultados: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const toInfo = (r: (typeof regatistas)[number]): RegatistaInfo => ({
    id: r.id,
    nombre: r.nombre,
    club: r.club?.nombre ?? null,
    resultadosCount: r._count.resultados,
    createdAt: r.createdAt,
  });

  const tokensDe = (nombre: string) => normalizarNombre(nombre).split(' ').filter(Boolean);
  const multiPalabra = regatistas.filter((r) => tokensDe(r.nombre).length >= 2);

  // Índice palabra->fichas: para no comparar cada nombre contra TODOS los
  // demás (con varios miles de regatistas, esa comparación de a pares
  // sería demasiado lenta acá adentro de una función serverless). Solo se
  // comparan nombres que ya comparten al menos una palabra exacta -alcanza,
  // porque sonNombresParecidos() exige que casi todas las palabras
  // coincidan, así que dos nombres realmente parecidos van a compartir
  // alguna palabra exacta salvo el caso raro de que la ÚNICA palabra
  // distinta sea, a la vez, la única que tienen en común dos personas de
  // nombre corto (2 palabras): un costo aceptable a cambio de que esto siga
  // siendo rápido.
  const porToken = new Map<string, typeof multiPalabra>();
  for (const r of multiPalabra) {
    for (const t of tokensDe(r.nombre)) {
      if (!porToken.has(t)) porToken.set(t, []);
      porToken.get(t)!.push(r);
    }
  }

  const vistos = new Set<string>(); // pares ya emitidos, por par de ids ordenado
  const resultado: ParDuplicadoSimilar[] = [];

  for (const r of multiPalabra) {
    const candidatos = new Set<(typeof multiPalabra)[number]>();
    for (const t of tokensDe(r.nombre)) for (const c of porToken.get(t) ?? []) candidatos.add(c);

    for (const c of candidatos) {
      if (c.id === r.id) continue;
      const parKey = [r.id, c.id].sort().join('|');
      if (vistos.has(parKey) || !sonNombresParecidos(r.nombre, c.nombre)) continue;
      vistos.add(parKey);
      resultado.push({ clave: parKey, a: toInfo(r), b: toInfo(c) });
    }
  }

  return resultado;
}
