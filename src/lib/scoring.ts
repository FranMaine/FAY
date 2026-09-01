// Types
export interface ResultadoRegata {
  regataNumero: number;
  puesto: number;
  puntos: number;
  descartado: boolean;
  observacion: string | null;
}

export interface ClasificacionRegatista {
  regatistaId: string;
  nombre: string;
  club: string | null;
  resultados: ResultadoRegata[];
  totalBruto: number;
  totalNeto: number;
  posicionFinal: number;
}

// Constants for penalty codes
export const PENALTY_CODES = ['DNF', 'DNS', 'DNC', 'DSQ', 'OCS', 'BFD', 'UFD', 'RET'] as const;
export type PenaltyCode = typeof PENALTY_CODES[number];

/**
 * Calculate penalty points for a given code.
 * In low-point system: DNF/DNS/DNC/DSQ/OCS/BFD/UFD/RET = number of entries + 1
 */
export function calcularPuntosPenalidad(codigo: PenaltyCode, totalInscritos: number): number {
  return totalInscritos + 1;
}

/**
 * Check if an observation string contains a penalty code
 */
export function esPenalidad(observacion: string | null): PenaltyCode | null {
  if (!observacion) return null;
  const upper = observacion.toUpperCase().trim();
  return PENALTY_CODES.find(code => upper === code) || null;
}

/**
 * Apply discards to a list of results.
 * Marks the N worst results as discarded.
 * Returns a new array with descartado flags updated.
 */
export function aplicarDescartes(
  resultados: ResultadoRegata[],
  cantidadDescartes: number
): ResultadoRegata[] {
  if (cantidadDescartes <= 0 || resultados.length <= cantidadDescartes) {
    return resultados.map(r => ({ ...r, descartado: false }));
  }

  // Sort by points descending to find worst results
  const indexedResults = resultados.map((r, idx) => ({ ...r, originalIndex: idx }));
  const sorted = [...indexedResults].sort((a, b) => b.puntos - a.puntos);

  // Mark the worst N as discarded
  const discardIndices = new Set(sorted.slice(0, cantidadDescartes).map(r => r.originalIndex));

  return resultados.map((r, idx) => ({
    ...r,
    descartado: discardIndices.has(idx),
  }));
}

/**
 * Calculate net total (sum of non-discarded results)
 */
export function calcularTotalNeto(resultados: ResultadoRegata[]): number {
  return resultados
    .filter(r => !r.descartado)
    .reduce((sum, r) => sum + r.puntos, 0);
}

/**
 * Calculate gross total (sum of all results)
 */
export function calcularTotalBruto(resultados: ResultadoRegata[]): number {
  return resultados.reduce((sum, r) => sum + r.puntos, 0);
}

/**
 * Tiebreaker: compare two sailors with the same net total.
 * Uses "most first places, then most second places, etc." rule (Appendix A, RRS)
 * Returns negative if a wins, positive if b wins, 0 if still tied.
 */
export function desempatar(
  resultadosA: ResultadoRegata[],
  resultadosB: ResultadoRegata[]
): number {
  const noDescartadosA = resultadosA.filter(r => !r.descartado);
  const noDescartadosB = resultadosB.filter(r => !r.descartado);

  // Count results at each position
  const maxPos = Math.max(
    ...noDescartadosA.map(r => r.puesto),
    ...noDescartadosB.map(r => r.puesto)
  );

  for (let pos = 1; pos <= maxPos; pos++) {
    const countA = noDescartadosA.filter(r => r.puesto === pos).length;
    const countB = noDescartadosB.filter(r => r.puesto === pos).length;
    if (countA !== countB) return countB - countA; // more is better (lower pos = better)
  }

  return 0; // truly tied
}

/**
 * Generate the full classification for a championship.
 * Takes raw data and returns sorted classification with all calculations.
 */
export function generarClasificacion(
  regatistas: Array<{
    regatistaId: string;
    nombre: string;
    club: string | null;
    resultados: Array<{
      regataNumero: number;
      puesto: number;
      puntos: number;
      observacion: string | null;
    }>;
  }>,
  cantidadDescartes: number
): ClasificacionRegatista[] {
  // 1. Apply discards to each sailor's results
  const clasificacion = regatistas.map(r => {
    const resultadosConDescartes = aplicarDescartes(
      r.resultados.map(res => ({ ...res, descartado: false })),
      cantidadDescartes
    );
    return {
      regatistaId: r.regatistaId,
      nombre: r.nombre,
      club: r.club,
      resultados: resultadosConDescartes,
      totalBruto: calcularTotalBruto(resultadosConDescartes),
      totalNeto: calcularTotalNeto(resultadosConDescartes),
      posicionFinal: 0,
    };
  });

  // 2. Sort by net total, then tiebreaker
  clasificacion.sort((a, b) => {
    if (a.totalNeto !== b.totalNeto) return a.totalNeto - b.totalNeto;
    return desempatar(a.resultados, b.resultados);
  });

  // 3. Assign final positions
  clasificacion.forEach((c, idx) => {
    c.posicionFinal = idx + 1;
  });

  return clasificacion;
}
