import NextAuth from 'next-auth';
import { CredentialsSignin } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { permitir } from './rate-limit';
import { usuarioDeGoogle } from './auth-google';

// Hash de una clave que nadie conoce, para gastar el mismo tiempo de bcrypt
// cuando el email no existe -sin esto, el login responde ~100 ms más rápido
// con un email inexistente que con una clave incorrecta, y eso permite
// averiguar qué emails tienen cuenta midiendo tiempos.
const HASH_FALSO = '$2b$10$Qm9a.6cn5ZcDQGG8rzu02OD6FkQlfC.0jovaXQJOhbAzimik2sCjW';

// "Continuar con Google" solo se ofrece si están cargadas las dos variables
// (ver el cliente OAuth en Google Cloud Console): sin ellas, el provider no se
// registra y los botones de login/registro no aparecen (se leen de
// /api/auth/providers), así que el sitio funciona igual sin configurarlo.
const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const REFRESCO_ROL_MS = 60_000;
const googleConfigurado = !!(googleClientId && googleClientSecret);

// Subclase propia para poder distinguir este caso puntual del resto de
// credenciales inválidas -ver el `code` custom, que sí viaja hasta el
// cliente (a diferencia del mensaje del Error, que Auth.js no expone).
// login/page.tsx lo usa para mostrar "confirmá tu email" en vez del
// genérico "email o contraseña incorrectos".
export class EmailNoVerificadoError extends CredentialsSignin {
  code = 'email_no_verificado';
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // NextAuth v5 busca AUTH_SECRET por default -esto lo hace explícito y
  // además acepta NEXTAUTH_SECRET (el nombre de la v4, que es el que
  // quedó cargado en algunos entornos) sin depender de que la librería
  // decida sola cuál de los dos mirar.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Mismo criterio que en registro: emails los tratamos como
        // insensibles a mayúsculas, así "Juan@Gmail.com" y "juan@gmail.com"
        // son la misma cuenta.
        const email = String(credentials.email).trim().toLowerCase();

        // Máximo 10 intentos de login por email cada 5 minutos -frena un
        // ataque de fuerza bruta/credential-stuffing contra una cuenta
        // puntual sin afectar a alguien que se equivoca de contraseña un
        // par de veces. authorize() no recibe la request acá, así que el
        // límite es por email (no por IP además).
        if (!(await permitir(`login:${email}`, 10, 5 * 60 * 1000))) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user?.passwordHash ?? HASH_FALSO
        );

        if (!user || !user.passwordHash || !isValid) return null;

        // Se manda un mail de verificación al registrarse (ver
        // /api/registro), pero antes esto nunca se chequeaba acá: se podía
        // usar la cuenta entera sin haber tocado el link. Solo afecta al
        // login con contraseña -Google ya confirma el email por su cuenta.
        if (!user.emailVerified) throw new EmailNoVerificadoError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    ...(googleConfigurado
      ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })]
      : []),
  ],
  callbacks: {
    // Con Google no hay formulario que valide nada: acá se decide si la
    // persona entra (y se crea/vincula su cuenta). Devolver false manda a
    // /login?error=AccessDenied.
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;
      const resultado = await usuarioDeGoogle(account.providerAccountId, profile ?? {});
      return resultado.ok;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        // El `user` que llega acá es el perfil de Google (su id no es el de
        // nuestra base): se vuelve a buscar la cuenta por email para que el
        // token lleve el id, el rol y el regatista de Orzando.
        const email = (user?.email ?? token.email ?? '').toLowerCase();
        const cuenta = email ? await prisma.user.findUnique({ where: { email } }) : null;
        // signIn() ya la creó o la encontró: si no está, mejor cortar que
        // dejar un token con el id de Google como si fuera de un usuario.
        if (!cuenta) throw new Error('No se encontró la cuenta de Orzando para el inicio de sesión con Google');
        token.sub = cuenta.id;
        token.role = cuenta.role;
        token.regatistaId = cuenta.regatistaId ?? null;
      } else if (user) {
        token.role = user.role ?? 'REGULAR';
        token.regatistaId = user.regatistaId ?? null;
      }

      // El JWT guarda el rol del momento del login: sin esto, si un admin
      // cambia el rol de alguien (o borra su cuenta) la sesión vieja seguía
      // con los permisos anteriores hasta cerrar sesión. Se relee de la base
      // como mucho una vez por minuto; si la cuenta ya no existe, se corta
      // la sesión.
      const ahora = Date.now();
      const leidoEn = typeof token.rolLeidoEn === 'number' ? token.rolLeidoEn : 0;
      if (token.sub && ahora - leidoEn > REFRESCO_ROL_MS) {
        const cuenta = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, regatistaId: true },
        });
        if (!cuenta) return null;
        token.role = cuenta.role;
        token.regatistaId = cuenta.regatistaId ?? null;
        token.rolLeidoEn = ahora;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // token.role/regatistaId vienen tipados vía el JWT ampliado en
        // src/types/next-auth.d.ts, pero next-auth v5 beta expone `token`
        // acá como el genérico `JWT` sin la extensión resuelta, así que
        // una aserción local es lo suficiente para eso.
        session.user.role = token.role as 'ADMIN' | 'ORGANIZADOR' | 'REGULAR';
        session.user.regatistaId = token.regatistaId as string | null;
      }
      return session;
    },
  },
});
