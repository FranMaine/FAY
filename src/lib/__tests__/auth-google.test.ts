import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaFalso = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  account: { upsert: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: prismaFalso }));

import { usuarioDeGoogle } from '../auth-google';

const PERFIL = { email: 'Ana@Gmail.com', email_verified: true, name: 'Ana Gómez', picture: 'https://foto' };

describe('usuarioDeGoogle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza un perfil sin email', async () => {
    expect(await usuarioDeGoogle('g1', { ...PERFIL, email: null })).toEqual({ ok: false, motivo: 'sin_email' });
    expect(prismaFalso.user.create).not.toHaveBeenCalled();
  });

  it('rechaza si Google no verificó el email (no se puede confiar en él)', async () => {
    expect(await usuarioDeGoogle('g1', { ...PERFIL, email_verified: false })).toEqual({
      ok: false,
      motivo: 'email_no_verificado',
    });
    expect(prismaFalso.user.findUnique).not.toHaveBeenCalled();
    expect(prismaFalso.user.create).not.toHaveBeenCalled();
  });

  it('crea la cuenta con el email en minúsculas, verificado y con los términos aceptados', async () => {
    prismaFalso.user.findUnique.mockResolvedValue(null);
    prismaFalso.user.create.mockResolvedValue({ id: 'u-nuevo' });

    const r = await usuarioDeGoogle('g1', PERFIL);

    expect(r).toEqual({ ok: true, userId: 'u-nuevo', creado: true });
    expect(prismaFalso.user.findUnique).toHaveBeenCalledWith({ where: { email: 'ana@gmail.com' } });
    const data = prismaFalso.user.create.mock.calls[0][0].data;
    expect(data.email).toBe('ana@gmail.com');
    expect(data.emailVerified).toBeInstanceOf(Date);
    expect(data.aceptoTerminosEn).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('passwordHash');
    expect(prismaFalso.account.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'g1' } },
        create: { userId: 'u-nuevo', type: 'oidc', provider: 'google', providerAccountId: 'g1' },
      }),
    );
  });

  it('entra a la cuenta existente (ya verificada) sin tocarla', async () => {
    prismaFalso.user.findUnique.mockResolvedValue({ id: 'u1', emailVerified: new Date(), passwordHash: 'hash' });

    const r = await usuarioDeGoogle('g1', PERFIL);

    expect(r).toEqual({ ok: true, userId: 'u1', creado: false });
    expect(prismaFalso.user.create).not.toHaveBeenCalled();
    expect(prismaFalso.user.update).not.toHaveBeenCalled();
    expect(prismaFalso.account.upsert).toHaveBeenCalled();
  });

  it('si la cuenta existente no tenía el email verificado, lo verifica y borra la contraseña', async () => {
    prismaFalso.user.findUnique.mockResolvedValue({ id: 'u2', emailVerified: null, passwordHash: 'hash-de-otro' });

    const r = await usuarioDeGoogle('g1', PERFIL);

    expect(r).toEqual({ ok: true, userId: 'u2', creado: false });
    const arg = prismaFalso.user.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'u2' });
    expect(arg.data.emailVerified).toBeInstanceOf(Date);
    expect(arg.data.passwordHash).toBeNull();
  });
});
