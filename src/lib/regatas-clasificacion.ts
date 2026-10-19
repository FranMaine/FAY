// Columnas de Regata/Resultado/Regatista que de verdad necesita
// agruparPorRegatista + generarClasificacion (ver scoring.ts). Los rankings y
// los podios recorren TODOS los campeonatos publicados, así que traer
// objetos completos (con `include`) arrastraba por cada resultado sus campos
// JSON, la foto, fuenteIds, el club entero, etc. -mucho más de lo que se usa.

const regatistaBase = {
  id: true,
  nombre: true,
  clubId: true,
  club: { select: { nombre: true } },
} as const;

const resultadoBase = {
  regatistaId: true,
  puesto: true,
  puntos: true,
  observacion: true,
  flota: true,
  flotaOrden: true,
  puestoOficial: true,
  totalOficial: true,
} as const;

export const REGATAS_CLASIFICACION = {
  select: {
    numero: true,
    resultados: { select: { ...resultadoBase, regatista: { select: regatistaBase } } },
  },
} as const;

// Igual, más los ids de los clubes secundarios (regatistas con doble club).
export const REGATAS_CLASIFICACION_CON_OTROS_CLUBES = {
  select: {
    numero: true,
    resultados: {
      select: {
        ...resultadoBase,
        regatista: { select: { ...regatistaBase, otrosClubes: { select: { id: true } } } },
      },
    },
  },
} as const;
