import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crearFakePrisma } from './fake-prisma';

// fusionarRegatistas importa `prisma` desde '@/lib/db' -se reemplaza ese
// módulo por la fake antes de importar la función bajo test, así que
// nunca toca una base real.
let fake: ReturnType<typeof crearFakePrisma>;
vi.mock('@/lib/db', () => ({
  get prisma() {
    return fake;
  },
}));

const { fusionarRegatistas } = await import('../regatista-merge');

describe('fusionarRegatistas', () => {
  beforeEach(() => {
    fake = crearFakePrisma({
      regatistas: [
        { id: 'canon', nombre: 'Juan Perez', clubId: 'clubA', otrosClubesIds: [] },
        { id: 'dup', nombre: 'Juan Perez', clubId: null, otrosClubesIds: [] },
      ],
      resultados: [
        { id: 'r1', regataId: 'regata1', regatistaId: 'dup', puesto: 3, puntos: 3 },
      ],
      solicitudes: [],
      usuarios: [],
    });
  });

  it('rejects when the canonical id is also in the duplicates list', async () => {
    await expect(fusionarRegatistas('canon', ['canon'])).rejects.toThrow(
      'no puede estar también en la lista de duplicados'
    );
  });

  it('throws when the canonical regatista does not exist', async () => {
    await expect(fusionarRegatistas('no-existe', ['dup'])).rejects.toThrow('no encontrado');
  });

  it('skips a duplicate id that no longer exists instead of failing', async () => {
    const resumen = await fusionarRegatistas('canon', ['ya-no-existe']);
    expect(resumen.duplicadosBorrados).toBe(0);
  });

  it('moves results to the canonical regatista and deletes the duplicate', async () => {
    const resumen = await fusionarRegatistas('canon', ['dup']);

    expect(resumen.resultadosMovidos).toBe(1);
    expect(resumen.duplicadosBorrados).toBe(1);

    const resultado = await fake.resultado.findUnique({ where: { id: 'r1' } });
    expect(resultado!.regatistaId).toBe('canon');

    const dup = await fake.regatista.findUnique({ where: { id: 'dup' } });
    expect(dup).toBeNull();
  });

  it('discards the duplicate result instead of failing when the canonical already has one for the same regata', async () => {
    fake = crearFakePrisma({
      regatistas: [
        { id: 'canon', nombre: 'Juan Perez', clubId: 'clubA', otrosClubesIds: [] },
        { id: 'dup', nombre: 'Juan Perez', clubId: null, otrosClubesIds: [] },
      ],
      resultados: [
        { id: 'r-canon', regataId: 'regata1', regatistaId: 'canon', puesto: 1, puntos: 1 },
        { id: 'r-dup', regataId: 'regata1', regatistaId: 'dup', puesto: 3, puntos: 3 },
      ],
    });

    const resumen = await fusionarRegatistas('canon', ['dup']);

    expect(resumen.resultadosDescartados).toBe(1);
    expect(resumen.resultadosMovidos).toBe(0);
    expect(await fake.resultado.findUnique({ where: { id: 'r-dup' } })).toBeNull();
    expect((await fake.resultado.findUnique({ where: { id: 'r-canon' } }))!.puesto).toBe(1);
  });

  it('inherits the club from the duplicate when the canonical has none', async () => {
    await fusionarRegatistas('canon', ['dup']);
    // no-op para este seed (canon ya tenía clubA) -ver el siguiente test
    // para el caso donde sí hereda.
  });

  it('sets the canonical club from the duplicate when the canonical had none', async () => {
    fake = crearFakePrisma({
      regatistas: [
        { id: 'canon', nombre: 'Juan Perez', clubId: null, otrosClubesIds: [] },
        { id: 'dup', nombre: 'Juan Perez', clubId: 'clubB', otrosClubesIds: [] },
      ],
    });

    await fusionarRegatistas('canon', ['dup']);

    expect((await fake.regatista.findUnique({ where: { id: 'canon' } }))!.clubId).toBe('clubB');
  });

  it('merges the duplicate club (and its secondary clubs) into the canonical as otrosClubes', async () => {
    fake = crearFakePrisma({
      regatistas: [
        { id: 'canon', nombre: 'Juan Perez', clubId: 'clubA', otrosClubesIds: [] },
        { id: 'dup', nombre: 'Juan Perez', clubId: 'clubB', otrosClubesIds: ['clubC'] },
      ],
    });

    await fusionarRegatistas('canon', ['dup']);

    const canon = await fake.regatista.findUnique({ where: { id: 'canon' } });
    const idsSecundarios = (canon!.otrosClubes as { id: string }[]).map((c) => c.id).sort();
    expect(idsSecundarios).toEqual(['clubB', 'clubC']);
  });

  it('unlinks the duplicate user when the canonical is already linked to someone else', async () => {
    fake = crearFakePrisma({
      regatistas: [
        { id: 'canon', nombre: 'Juan Perez', clubId: 'clubA', otrosClubesIds: [] },
        { id: 'dup', nombre: 'Juan Perez', clubId: null, otrosClubesIds: [] },
      ],
      usuarios: [
        { id: 'u1', regatistaId: 'canon' },
        { id: 'u2', regatistaId: 'dup' },
      ],
    });

    const resumen = await fusionarRegatistas('canon', ['dup']);

    expect(resumen.usuariosDesvinculados).toBe(1);
    expect((await fake.user.findUnique({ where: { id: 'u2' } }))!.regatistaId).toBeNull();
    expect((await fake.user.findUnique({ where: { id: 'u1' } }))!.regatistaId).toBe('canon');
  });

  it('relinks the duplicate user to the canonical when the canonical has no user yet', async () => {
    fake = crearFakePrisma({
      regatistas: [
        { id: 'canon', nombre: 'Juan Perez', clubId: 'clubA', otrosClubesIds: [] },
        { id: 'dup', nombre: 'Juan Perez', clubId: null, otrosClubesIds: [] },
      ],
      usuarios: [{ id: 'u2', regatistaId: 'dup' }],
    });

    await fusionarRegatistas('canon', ['dup']);

    expect((await fake.user.findUnique({ where: { id: 'u2' } }))!.regatistaId).toBe('canon');
  });
});
