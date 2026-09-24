// Prisma "falso" en memoria para testear las funciones de fusión
// (regatista-merge.ts, club-merge.ts) sin necesitar una base real. Solo
// implementa el subconjunto de la API de Prisma que esas funciones usan
// -no es un mock genérico, es a propósito chico y específico.

type Row = Record<string, unknown> & { id: string };

function clone<T>(v: T): T {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

class Tabla<T extends Row> {
  filas: T[] = [];

  constructor(filas: T[] = []) {
    this.filas = filas;
  }

  async findUnique({ where }: { where: Record<string, unknown> }): Promise<T | null> {
    const [campo, valor] = Object.entries(where)[0];
    // Prisma representa una @@unique compuesta (ej: regataId_regatistaId)
    // como una sola clave cuyo valor es un objeto con cada sub-campo -acá
    // se compara campo por campo en vez de buscar un campo literal con
    // ese nombre compuesto, que ninguna fila tiene.
    const fila =
      valor && typeof valor === 'object'
        ? this.filas.find((f) => coincide(f, valor as Record<string, unknown>))
        : this.filas.find((f) => (f as Record<string, unknown>)[campo] === valor);
    return fila ? clone(fila) : null;
  }

  async findMany({ where }: { where?: Record<string, unknown> } = {}): Promise<T[]> {
    if (!where) return clone(this.filas);
    return clone(this.filas.filter((f) => coincide(f, where)));
  }

  async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T> {
    const [campo, valor] = Object.entries(where)[0];
    const fila = this.filas.find((f) => (f as Record<string, unknown>)[campo] === valor);
    if (!fila) throw new Error(`No encontrado: ${campo}=${valor}`);
    Object.assign(fila, aplicarData(fila, data));
    return clone(fila);
  }

  async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
    const filas = this.filas.filter((f) => coincide(f, where));
    for (const f of filas) Object.assign(f, aplicarData(f, data));
    return { count: filas.length };
  }

  async delete({ where }: { where: Record<string, unknown> }) {
    const [campo, valor] = Object.entries(where)[0];
    const idx = this.filas.findIndex((f) => (f as Record<string, unknown>)[campo] === valor);
    if (idx === -1) throw new Error(`No encontrado: ${campo}=${valor}`);
    const [borrada] = this.filas.splice(idx, 1);
    return clone(borrada);
  }
}

// Coincidencia mínima: soporta campos planos y `{ some: { id } }` para las
// relaciones many-to-many (otrosClubes) usadas en club-merge.ts.
function coincide(fila: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([campo, cond]) => {
    if (cond && typeof cond === 'object' && 'some' in (cond as Record<string, unknown>)) {
      const ids = (fila as { otrosClubesIds?: string[] }).otrosClubesIds ?? [];
      const buscado = ((cond as { some: { id: string } }).some).id;
      return ids.includes(buscado);
    }
    if (cond && typeof cond === 'object' && 'in' in (cond as Record<string, unknown>)) {
      const lista = (cond as { in: unknown[] }).in;
      return lista.includes((fila as Record<string, unknown>)[campo]);
    }
    return (fila as Record<string, unknown>)[campo] === cond;
  });
}

// Aplica `data`, incluyendo las operaciones de relación many-to-many
// (connect/disconnect) sobre `otrosClubesIds`, que es cómo esta fake
// representa la tabla de unión de Regatista.otrosClubes.
function aplicarData(fila: Row, data: Record<string, unknown>): Record<string, unknown> {
  const resultado: Record<string, unknown> = { ...data };
  if (data.otrosClubes && typeof data.otrosClubes === 'object') {
    const actual = new Set(((fila as { otrosClubesIds?: string[] }).otrosClubesIds ?? []));
    const rel = data.otrosClubes as { connect?: { id: string }[]; disconnect?: { id: string }[]; set?: { id: string }[] };
    if (rel.set) actual.clear();
    for (const c of rel.connect ?? []) actual.add(c.id);
    for (const d of rel.disconnect ?? []) actual.delete(d.id);
    for (const c of rel.set ?? []) actual.add(c.id);
    resultado.otrosClubesIds = [...actual];
    delete resultado.otrosClubes;
  }
  return resultado;
}

export function crearFakePrisma(seed: {
  clubes?: Row[];
  regatistas?: Row[];
  resultados?: Row[];
  solicitudes?: Row[];
  usuarios?: Row[];
  campeonatos?: Row[];
}) {
  const club = new Tabla(seed.clubes ?? []);
  const regatistaBase = new Tabla(seed.regatistas ?? []);
  const resultado = new Tabla(seed.resultados ?? []);
  const solicitudVinculacion = new Tabla(seed.solicitudes ?? []);
  const user = new Tabla(seed.usuarios ?? []);
  const campeonato = new Tabla(seed.campeonatos ?? []);

  // regatista.findUnique/findMany devuelven `otrosClubes` como objetos
  // {id} (como haría Prisma con un include/select), no como
  // `otrosClubesIds` crudo -se traduce acá para que el código bajo test
  // (que espera esa forma) no tenga que saber nada de esta fake.
  const conOtrosClubesComoObjetos = (r: Row): Row => {
    const ids = (r as { otrosClubesIds?: string[] }).otrosClubesIds ?? [];
    return { ...r, otrosClubes: ids.map((id) => ({ id })) };
  };

  const regatista = {
    findUnique: async (args: Parameters<Tabla<Row>['findUnique']>[0]) => {
      const r = await regatistaBase.findUnique(args);
      return r ? conOtrosClubesComoObjetos(r) : null;
    },
    findMany: async (args: Parameters<Tabla<Row>['findMany']>[0]) => {
      const rs = await regatistaBase.findMany(args);
      return rs.map(conOtrosClubesComoObjetos);
    },
    update: (args: Parameters<Tabla<Row>['update']>[0]) => regatistaBase.update(args),
    updateMany: (args: Parameters<Tabla<Row>['updateMany']>[0]) => regatistaBase.updateMany(args),
    delete: (args: Parameters<Tabla<Row>['delete']>[0]) => regatistaBase.delete(args),
  };

  return { club, regatista, resultado, solicitudVinculacion, user, campeonato };
}
