import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crearFakePrisma } from './fake-prisma';

let fake: ReturnType<typeof crearFakePrisma>;
vi.mock('@/lib/db', () => ({
  get prisma() {
    return fake;
  },
}));

const { fusionarClubes } = await import('../club-merge');

describe('fusionarClubes', () => {
  beforeEach(() => {
    fake = crearFakePrisma({
      clubes: [
        { id: 'canon', nombre: 'YCA', logoUrl: null, nombreCompleto: null },
        { id: 'dup', nombre: 'Yacht Club Argentino', logoUrl: '/escudos/dup.webp', nombreCompleto: 'Yacht Club Argentino' },
      ],
      regatistas: [
        { id: 'r1', clubId: 'dup', otrosClubesIds: [] },
        { id: 'r2', clubId: 'canon', otrosClubesIds: ['dup'] },
        { id: 'r3', clubId: 'otro', otrosClubesIds: ['dup'] },
      ],
      campeonatos: [{ id: 'c1', sedeId: 'dup' }],
    });
  });

  it('rejects when the canonical id is also in the duplicates list', async () => {
    await expect(fusionarClubes('canon', ['canon'])).rejects.toThrow('no puede estar también');
  });

  it('throws when the canonical club does not exist', async () => {
    await expect(fusionarClubes('nada', ['dup'])).rejects.toThrow('no encontrado');
  });

  it('skips a duplicate that no longer exists', async () => {
    const resumen = await fusionarClubes('canon', ['ya-no-existe']);
    expect(resumen.duplicadosBorrados).toBe(0);
  });

  it('moves primary-club regatistas and venue campeonatos, then deletes the duplicate', async () => {
    const resumen = await fusionarClubes('canon', ['dup']);

    expect(resumen.regatistasMovidos).toBe(1);
    expect(resumen.campeonatosMovidos).toBe(1);
    expect(resumen.duplicadosBorrados).toBe(1);
    expect((await fake.regatista.findUnique({ where: { id: 'r1' } }))!.clubId).toBe('canon');
    expect((await fake.campeonato.findUnique({ where: { id: 'c1' } }))!.sedeId).toBe('canon');
    expect(await fake.club.findUnique({ where: { id: 'dup' } })).toBeNull();
  });

  it('replaces the duplicate with the canonical in secondary clubs, without repeating it', async () => {
    await fusionarClubes('canon', ['dup']);

    // r2 ya tenía al canónico como principal: no debe quedar repetido como secundario.
    const r2 = await fake.regatista.findUnique({ where: { id: 'r2' } });
    expect((r2!.otrosClubes as { id: string }[]).map((c) => c.id)).toEqual([]);

    // r3 tenía al duplicado como secundario: pasa a tener al canónico.
    const r3 = await fake.regatista.findUnique({ where: { id: 'r3' } });
    expect((r3!.otrosClubes as { id: string }[]).map((c) => c.id)).toEqual(['canon']);
  });

  it('keeps the duplicate logo and full name when the canonical has none', async () => {
    await fusionarClubes('canon', ['dup']);

    const canon = await fake.club.findUnique({ where: { id: 'canon' } });
    expect(canon!.logoUrl).toBe('/escudos/dup.webp');
    expect(canon!.nombreCompleto).toBe('Yacht Club Argentino');
  });

  it('does not overwrite the canonical logo when it already has one', async () => {
    fake = crearFakePrisma({
      clubes: [
        { id: 'canon', nombre: 'YCA', logoUrl: '/escudos/canon.webp', nombreCompleto: 'Propio' },
        { id: 'dup', nombre: 'X', logoUrl: '/escudos/dup.webp', nombreCompleto: 'Otro' },
      ],
    });

    await fusionarClubes('canon', ['dup']);

    const canon = await fake.club.findUnique({ where: { id: 'canon' } });
    expect(canon!.logoUrl).toBe('/escudos/canon.webp');
    expect(canon!.nombreCompleto).toBe('Propio');
  });
});
