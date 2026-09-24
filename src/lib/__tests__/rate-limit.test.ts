import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Entry = { clave: string; intentos: number; ventanaInicio: Date };
let tabla: Map<string, Entry>;

vi.mock('@/lib/db', () => ({
  prisma: {
    rateLimitEntry: {
      findUnique: async ({ where }: { where: { clave: string } }) => tabla.get(where.clave) ?? null,
      upsert: async ({ where, create, update }: { where: { clave: string }; create: Entry; update: Partial<Entry> }) => {
        const actual = tabla.get(where.clave);
        tabla.set(where.clave, actual ? { ...actual, ...update } : create);
      },
      update: async ({ where, data }: { where: { clave: string }; data: { intentos: { increment: number } } }) => {
        const actual = tabla.get(where.clave)!;
        tabla.set(where.clave, { ...actual, intentos: actual.intentos + data.intentos.increment });
      },
      deleteMany: async () => ({ count: 0 }),
    },
  },
}));

const { permitir, ipDeRequest } = await import('../rate-limit');

describe('permitir', () => {
  beforeEach(() => {
    tabla = new Map();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('allows attempts up to the limit and blocks the next one', async () => {
    for (let i = 0; i < 3; i++) expect(await permitir('k', 3, 60_000)).toBe(true);
    expect(await permitir('k', 3, 60_000)).toBe(false);
  });

  it('tracks different keys independently', async () => {
    for (let i = 0; i < 3; i++) await permitir('a', 3, 60_000);
    expect(await permitir('a', 3, 60_000)).toBe(false);
    expect(await permitir('b', 3, 60_000)).toBe(true);
  });

  it('starts a fresh window after the previous one expires', async () => {
    for (let i = 0; i < 3; i++) await permitir('k', 3, 60_000);
    expect(await permitir('k', 3, 60_000)).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'));
    expect(await permitir('k', 3, 60_000)).toBe(true);
  });
});

describe('ipDeRequest', () => {
  it('uses the first x-forwarded-for entry', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
    expect(ipDeRequest(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip, then to "desconocida"', () => {
    expect(ipDeRequest(new Request('http://x', { headers: { 'x-real-ip': '9.9.9.9' } }))).toBe('9.9.9.9');
    expect(ipDeRequest(new Request('http://x'))).toBe('desconocida');
  });
});
