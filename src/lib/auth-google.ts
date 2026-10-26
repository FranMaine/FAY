import { prisma } from './db';

// Lo que Google devuelve del perfil y que acá se usa (OpenID Connect).
export interface PerfilGoogle {
  email?: string | null;
  email_verified?: boolean | null;
  name?: string | null;
  picture?: string | null;
}

export type ResultadoGoogle =
  | { ok: true; userId: string; creado: boolean }
  | { ok: false; motivo: 'sin_email' | 'email_no_verificado' };

// Busca (o crea) la cuenta de Orzando que corresponde a un inicio de sesión
// con Google, y deja registrada la vinculación en `Account`.
//
// - La cuenta se identifica por email, igual que el login con contraseña
//   (siempre en minúsculas). Solo se confía en el email si Google lo marca
//   como verificado: si no, cualquiera podría crear una cuenta de Google con
//   el email ajeno y entrar a la cuenta de otra persona.
// - Si el email ya tenía una cuenta con contraseña y SIN verificar, esa
//   contraseña la pudo haber puesto cualquiera que se anotó con un email que
//   no es suyo: se confirma el email (Google lo acaba de confirmar) y se
//   borra la contraseña, así quien tenga la casilla es el único que entra.
//   Puede volver a poner una con "¿Olvidaste tu contraseña?".
// - Una cuenta nueva queda con el email verificado y con la fecha de
//   aceptación de los términos (la pantalla avisa que continuar con Google
//   los acepta, ya que no hay checkbox como en el registro).
export async function usuarioDeGoogle(
  providerAccountId: string,
  perfil: PerfilGoogle,
): Promise<ResultadoGoogle> {
  const email = perfil.email?.trim().toLowerCase();
  if (!email) return { ok: false, motivo: 'sin_email' };
  if (perfil.email_verified !== true) return { ok: false, motivo: 'email_no_verificado' };

  const existente = await prisma.user.findUnique({ where: { email } });
  let userId: string;
  let creado = false;

  if (existente) {
    userId = existente.id;
    if (!existente.emailVerified) {
      await prisma.user.update({
        where: { id: existente.id },
        data: { emailVerified: new Date(), passwordHash: null },
      });
    }
  } else {
    const nuevo = await prisma.user.create({
      data: {
        email,
        name: perfil.name ?? null,
        image: perfil.picture ?? null,
        emailVerified: new Date(),
        aceptoTerminosEn: new Date(),
      },
    });
    userId = nuevo.id;
    creado = true;
  }

  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId } },
    create: { userId, type: 'oidc', provider: 'google', providerAccountId },
    update: {},
  });

  return { ok: true, userId, creado };
}
