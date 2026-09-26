import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prisma mínimo en memoria: solo lo que usa importCampeonatoResults.
type Fila = Record<string, unknown> & { id: string };
let seq = 0;
const nuevoId = () => `id${++seq}`;

function tabla(filas: Fila[] = []) {
  return {
    filas,
    findMany: async (args?: { where?: Record<string, unknown> }) =>
      filas.filter((f) => !args?.where || Object.entries(args.where).every(([k, v]) => f[k] === v)),
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const fila = { id: nuevoId(), ...data } as Fila;
      filas.push(fila);
      return fila;
    },
  };
}

let db: ReturnType<typeof crearDb>;
function crearDb(seed: { clubes?: Fila[]; regatistas?: Fila[]; regatas?: Fila[] } = {}) {
  const club = {
    ...tabla(seed.clubes),
    upsert: async ({ where, create }: { where: { nombre: string }; create: Record<string, unknown> }) => {
      const ya = club.filas.find((c) => c.nombre === where.nombre);
      return ya ?? (await club.create({ data: create }));
    },
  };
  const resultado = {
    filas: [] as Fila[],
    upsert: async ({ where, update, create }: { where: { regataId_regatistaId: { regataId: string; regatistaId: string } }; update: Record<string, unknown>; create: Record<string, unknown> }) => {
      const k = where.regataId_regatistaId;
      const ya = resultado.filas.find((r) => r.regataId === k.regataId && r.regatistaId === k.regatistaId);
      if (ya) Object.assign(ya, update);
      else resultado.filas.push({ id: nuevoId(), ...create });
    },
  };
  return {
    club,
    regatista: tabla(seed.regatistas),
    regata: tabla(seed.regatas),
    resultado,
    campeonato: { findUnique: async ({ where }: { where: { id: string } }) => (where.id === 'camp' ? { id: 'camp' } : null) },
  };
}

vi.mock('@/lib/db', () => ({
  get default() {
    return db;
  },
  get prisma() {
    return db;
  },
}));

const { importCampeonatoResults } = await import('../import-service');

const fila = (nombre: string, club: string, regatas: [number, number, string?][]) => ({
  vela: '1',
  nombre,
  club,
  regatas: regatas.map(([numero, puntajeBruto, obs]) => ({ numero, puntajeBruto, observacion: obs ?? null })),
});

describe('importCampeonatoResults', () => {
  beforeEach(() => {
    seq = 0;
    db = crearDb();
  });

  it('falla si el campeonato no existe', async () => {
    await expect(importCampeonatoResults('nope', [])).rejects.toThrow('Campeonato no encontrado');
  });

  it('crea club, regatistas, regatas y resultados', async () => {
    const r = await importCampeonatoResults('camp', [
      fila('Ana Perez', 'cnsi', [[1, 1], [2, 2]]),
      fila('Juan Gomez', 'CNSI', [[1, 2], [2, 1]]),
    ]);
    expect(r.stats).toEqual({ totalInscritos: 2, regatistasNuevos: 2, regatasNuevas: 2, resultadosInsertados: 4 });
    expect(db.club.filas).toHaveLength(1);
    expect(db.club.filas[0].nombre).toBe('CNSI');
    expect(db.resultado.filas).toHaveLength(4);
  });

  it('es idempotente: reimportar no duplica nada', async () => {
    const datos = [fila('Ana Perez', 'CNSI', [[1, 1]])];
    await importCampeonatoResults('camp', datos);
    const r2 = await importCampeonatoResults('camp', datos);
    expect(r2.stats.regatistasNuevos).toBe(0);
    expect(r2.stats.regatasNuevas).toBe(0);
    expect(db.regatista.filas).toHaveLength(1);
    expect(db.resultado.filas).toHaveLength(1);
  });

  it('reusa al regatista aunque venga con el nombre al revés o con acentos', async () => {
    db = crearDb({ regatistas: [{ id: 'r1', nombre: 'Tomas Maine' }] });
    const r = await importCampeonatoResults('camp', [fila('Maine Tomás', 'CNSI', [[1, 1]])]);
    expect(r.stats.regatistasNuevos).toBe(0);
    expect(db.resultado.filas[0].regatistaId).toBe('r1');
  });

  it('desdobla una tripulación doble en dos regatistas con el mismo resultado', async () => {
    const r = await importCampeonatoResults('camp', [fila('Ana Perez & Luis Diaz', 'CNSI', [[1, 3]])]);
    expect(r.stats.regatistasNuevos).toBe(2);
    expect(db.resultado.filas).toHaveLength(2);
    expect(db.resultado.filas.every((x) => x.puntos === 3)).toBe(true);
  });

  it('una penalidad sin puntaje vale inscriptos + 1', async () => {
    await importCampeonatoResults('camp', [
      fila('Ana', 'A', [[1, 999, 'DNF']]),
      fila('Beto', 'B', [[1, 1]]),
      fila('Carl', 'C', [[1, 2]]),
    ]);
    const ana = db.resultado.filas.find((x) => x.observacion === 'DNF')!;
    expect(ana.puntos).toBe(4);
    expect(ana.puesto).toBe(4);
  });

  it('respeta el puntaje bruto cuando la fuente lo trae junto a la penalidad', async () => {
    await importCampeonatoResults('camp', [fila('Ana', 'A', [[1, 74, 'DNF']]), fila('Beto', 'B', [[1, 1]])]);
    expect(db.resultado.filas.find((x) => x.observacion === 'DNF')!.puntos).toBe(74);
  });

  it('reusa regatas ya existentes del campeonato', async () => {
    db = crearDb({ regatas: [{ id: 'g1', campeonatoId: 'camp', numero: 1 }] });
    const r = await importCampeonatoResults('camp', [fila('Ana', 'A', [[1, 1], [2, 2]])]);
    expect(r.stats.regatasNuevas).toBe(1);
    expect(db.resultado.filas.some((x) => x.regataId === 'g1')).toBe(true);
  });
});
