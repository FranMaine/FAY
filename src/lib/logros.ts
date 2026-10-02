import { prisma } from "@/lib/db";
import { getRankingGeneral } from "@/lib/ranking-general";
import { LOGROS, type LogroHistorialEntry, type LogroRegatistaInfo, type LogroDesbloqueado } from "@/lib/logros-catalogo";

// Lógica de cálculo del sistema de medallas/logros del perfil de
// regatista. La mayoría se calculan en el momento a partir del propio
// historial (ya lo trae armado /regatistas/[id]), sin tocar la base -los
// pocos que necesitan comparar contra OTROS regatistas (campeón de clase,
// primero del club) hacen sus propias consultas puntuales, acotadas a lo
// que hace falta.
//
// No hay una tabla Logro en la base: se recalculan en cada visita al
// perfil (mismo revalidate=60 que ya tiene la página) en vez de guardar un
// estado que habría que mantener sincronizado cada vez que se edita o
// elimina un resultado.
//
// El catálogo (LOGROS, los tipos) vive en logros-catalogo.ts, no acá: este
// archivo importa prisma, y LogrosSection (componente cliente) necesita el
// catálogo sin arrastrar eso al bundle del navegador.
export { LOGROS, type LogroHistorialEntry, type LogroRegatistaInfo, type LogroDesbloqueado };

const UMBRAL_MARGEN_AMPLIO = 10; // puntos netos de diferencia con el 2° puesto
const UMBRAL_INSCRIPTOS_MARGEN = 5; // evita falsos positivos en flotas chicas

function cronologico(historial: LogroHistorialEntry[]): LogroHistorialEntry[] {
  return [...historial].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

function etiquetaCampeonato(h: LogroHistorialEntry): string {
  return `${h.campeonatoNombre} ${h.anio}`;
}

/**
 * Logros que se calculan solo a partir del propio historial del
 * regatista -sin tocar la base-, para que sean fáciles de testear.
 */
export function calcularLogrosPersonales(
  historial: LogroHistorialEntry[],
  regatista: LogroRegatistaInfo
): LogroDesbloqueado[] {
  const out: LogroDesbloqueado[] = [];
  if (historial.length === 0) return out;

  const cron = cronologico(historial);

  // 1. Debut
  out.push({ id: "debut", detalle: etiquetaCampeonato(cron[0]) });

  // 2. Primeros puntos
  const primerosPuntos = cron.find((h) => h.posicion <= 10);
  if (primerosPuntos) out.push({ id: "primeros-puntos", detalle: etiquetaCampeonato(primerosPuntos) });

  // 3. Primer podio
  const primerPodio = cron.find((h) => h.posicion <= 3);
  if (primerPodio) out.push({ id: "primer-podio", detalle: etiquetaCampeonato(primerPodio) });

  // 4. Primera victoria
  const primeraVictoria = cron.find((h) => h.posicion === 1);
  if (primeraVictoria) out.push({ id: "primera-victoria", detalle: etiquetaCampeonato(primeraVictoria) });

  // 6. Mejora constante: 3 campeonatos seguidos (cronológicamente) donde
  // la posición mejoró respecto al anterior.
  for (let i = 2; i < cron.length; i++) {
    if (cron[i].posicion < cron[i - 1].posicion && cron[i - 1].posicion < cron[i - 2].posicion) {
      out.push({ id: "mejora-constante", detalle: etiquetaCampeonato(cron[i]) });
      break;
    }
  }

  // 7. Racha de podios: 3+ regatas seguidas (por número de regata) en
  // podio, dentro de un mismo campeonato.
  for (const h of historial) {
    const ordenadas = [...h.resultados].sort((a, b) => a.regataNumero - b.regataNumero);
    let racha = 0;
    let max = 0;
    for (const r of ordenadas) {
      racha = r.puesto <= 3 ? racha + 1 : 0;
      max = Math.max(max, racha);
    }
    if (max >= 3) {
      out.push({ id: "racha-podios", detalle: etiquetaCampeonato(h) });
      break;
    }
  }

  // 8. Remontada: la primera regata del campeonato (menor número) quedó
  // fuera del top 10, pero terminó en podio.
  for (const h of historial) {
    if (h.posicion > 3 || h.resultados.length === 0) continue;
    const primera = [...h.resultados].sort((a, b) => a.regataNumero - b.regataNumero)[0];
    if (primera.puesto > 10) {
      out.push({ id: "remontada", detalle: etiquetaCampeonato(h) });
      break;
    }
  }

  // 9. Doblete/Triplete: ganó el mismo campeonato (clase + evento/nombre)
  // en 2 o más años distintos.
  const victoriasPorSerie = new Map<string, Set<number>>();
  for (const h of historial) {
    if (h.posicion !== 1) continue;
    const clave = `${h.claseId}::${h.evento ?? h.campeonatoNombre}`;
    if (!victoriasPorSerie.has(clave)) victoriasPorSerie.set(clave, new Set());
    victoriasPorSerie.get(clave)!.add(h.anio);
  }
  for (const [, anios] of victoriasPorSerie) {
    if (anios.size >= 2) {
      out.push({ id: "doblete-triplete", detalle: `${anios.size} años` });
      break;
    }
  }

  // 10 / 20. Veterano / Capitán del timón: cantidad total de regatas
  // (no campeonatos) disputadas.
  const totalRegatas = historial.reduce((sum, h) => sum + h.resultados.length, 0);
  if (totalRegatas >= 50) out.push({ id: "veterano", detalle: `${totalRegatas} regatas` });
  if (totalRegatas >= 100) out.push({ id: "capitan-timon", detalle: `${totalRegatas} regatas` });

  // 11. Trayectoria larga: 5+ temporadas (años) distintas.
  const anios = new Set(historial.map((h) => h.anio));
  if (anios.size >= 5) out.push({ id: "trayectoria-larga", detalle: `${anios.size} temporadas` });

  // 12. Regular: 3+ campeonatos en un mismo año.
  const porAnio = new Map<number, number>();
  for (const h of historial) porAnio.set(h.anio, (porAnio.get(h.anio) ?? 0) + 1);
  const anioRegular = [...porAnio.entries()].find(([, cant]) => cant >= 3);
  if (anioRegular) out.push({ id: "regular", detalle: `${anioRegular[1]} campeonatos en ${anioRegular[0]}` });

  // 13. Sin descartes feos: de los resultados que sí se descartaron en
  // algún campeonato, ninguno quedó fuera del top 10. Solo cuenta si hubo
  // al menos un descarte real -si nunca descartó nada, no es un logro.
  const descartados = historial.flatMap((h) => h.resultados.filter((r) => r.descartado));
  if (descartados.length > 0 && descartados.every((r) => r.puesto <= 10)) {
    out.push({ id: "sin-descartes", detalle: `${descartados.length} descartes` });
  }

  // 14 / 15. Multiclase / Podio multiclase
  const clasesIds = new Set(historial.map((h) => h.claseId));
  if (clasesIds.size >= 3) out.push({ id: "multiclase", detalle: `${clasesIds.size} clases` });

  const mejorPorClase = new Map<string, number>();
  for (const h of historial) {
    const actual = mejorPorClase.get(h.claseId);
    if (actual === undefined || h.posicion < actual) mejorPorClase.set(h.claseId, h.posicion);
  }
  const clasesConPodio = [...mejorPorClase.values()].filter((p) => p <= 3).length;
  if (clasesConPodio >= 2) out.push({ id: "podio-multiclase", detalle: `${clasesConPodio} clases` });

  // 16. Dos colores: 2+ clubes representados.
  const clubesCount = (regatista.clubId ? 1 : 0) + regatista.otrosClubesIds.length;
  if (clubesCount >= 2) out.push({ id: "dos-colores", detalle: `${clubesCount} clubes` });

  // 19. Margen amplio
  const margenAmplio = cron.find(
    (h) => h.posicion === 1 && h.totalInscriptos >= UMBRAL_INSCRIPTOS_MARGEN &&
      h.diferenciaSegundo !== null && h.diferenciaSegundo >= UMBRAL_MARGEN_AMPLIO
  );
  if (margenAmplio) {
    out.push({ id: "margen-amplio", detalle: `+${margenAmplio.diferenciaSegundo} pts sobre el 2°` });
  }

  // 21. Imbatible: ganó TODAS las regatas de un campeonato (2+ regatas).
  const imbatible = historial.find(
    (h) => h.resultados.length >= 2 && h.resultados.every((r) => r.puesto === 1)
  );
  if (imbatible) out.push({ id: "imbatible", detalle: etiquetaCampeonato(imbatible) });

  return out;
}

/**
 * 5. Campeón de clase: 1° en el ranking general (anual) de alguna de las
 * clases/años en las que compitió. Reusa getRankingGeneral (ya cacheado 1h,
 * invalidado por el tag "rankings") en vez de recalcularlo acá -se llama
 * una vez por cada (clase, año) distinto que aparece en su historial, no
 * por cada campeonato.
 */
async function calcularLogroCampeonClase(
  regatistaId: string,
  historial: LogroHistorialEntry[]
): Promise<LogroDesbloqueado | null> {
  const pares = new Map<string, { claseId: string; anio: number; label: string }>();
  for (const h of historial) {
    pares.set(`${h.claseId}::${h.anio}`, { claseId: h.claseId, anio: h.anio, label: `${h.anio}` });
  }

  for (const { claseId, anio, label } of pares.values()) {
    const ranking = await getRankingGeneral(claseId, anio);
    if (ranking[0]?.id === regatistaId) {
      return { id: "campeon-clase", detalle: label };
    }
  }
  return null;
}

/**
 * 17/18. Primer podio / primer campeón del club: el primer resultado
 * (cronológicamente, entre TODOS los miembros del club) en podio o en 1°
 * puesto. Usa el puesto crudo de la regata (Resultado.puesto), no la
 * posición final del campeonato con descartes -mucho más barato (un solo
 * where indexado) y alcanza para esto: "alguien del club pisó un podio",
 * no hace falta reconstruir la clasificación entera de cada campeonato en
 * el que compitió cualquier miembro del club.
 */
async function calcularLogrosDeClub(
  regatistaId: string,
  clubId: string | null
): Promise<LogroDesbloqueado[]> {
  if (!clubId) return [];

  async function primero(puestoFiltro: { lte: number } | number): Promise<string | null> {
    const resultados = await prisma.resultado.findMany({
      where: {
        puesto: puestoFiltro,
        regatista: { clubId },
        regata: { campeonato: { estado: "PUBLICADO" } },
      },
      select: {
        regatistaId: true,
        regata: { select: { campeonato: { select: { anio: true, fechaInicio: true } } } },
      },
    });
    if (resultados.length === 0) return null;
    resultados.sort((a, b) => {
      const fa = a.regata.campeonato.fechaInicio ?? new Date(a.regata.campeonato.anio, 0, 1);
      const fb = b.regata.campeonato.fechaInicio ?? new Date(b.regata.campeonato.anio, 0, 1);
      return fa.getTime() - fb.getTime();
    });
    return resultados[0].regatistaId;
  }

  const out: LogroDesbloqueado[] = [];
  const [primerPodio, primerCampeon] = await Promise.all([
    primero({ lte: 3 }),
    primero(1),
  ]);
  if (primerPodio === regatistaId) out.push({ id: "primer-podio-club", detalle: "" });
  if (primerCampeon === regatistaId) out.push({ id: "primer-campeon-club", detalle: "" });
  return out;
}

/**
 * Punto de entrada: junta los logros propios (síncronos) con los que
 * necesitan consultar la base (clase/club), y devuelve la lista en el
 * mismo orden que LOGROS.
 */
export async function calcularLogros(
  regatista: LogroRegatistaInfo,
  historial: LogroHistorialEntry[]
): Promise<LogroDesbloqueado[]> {
  if (historial.length === 0) return [];

  const [campeonClase, deClub] = await Promise.all([
    calcularLogroCampeonClase(regatista.id, historial),
    calcularLogrosDeClub(regatista.id, regatista.clubId),
  ]);

  const propios = calcularLogrosPersonales(historial, regatista);
  const todos = [...propios, ...(campeonClase ? [campeonClase] : []), ...deClub];

  const orden = new Map(LOGROS.map((l, idx) => [l.id, idx]));
  return todos.sort((a, b) => (orden.get(a.id) ?? 99) - (orden.get(b.id) ?? 99));
}
