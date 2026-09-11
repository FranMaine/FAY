import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // @auth/prisma-adapter estaba instalado pero nunca conectado acá -sin
  // adapter, un login con Google NUNCA crea una fila en la tabla User: solo
  // arma una sesión JWT con un id que no existe en la base. Cualquier cosa
  // que después use session.user.id para tocar la base (ej: POST
  // /api/vincular, que hace solicitudVinculacion.create con userId) rompía
  // con una violación de foreign key para cualquiera que entrara por
  // Google. El adapter sigue coexistiendo bien con `strategy: 'jwt'` -es el
  // modo soportado oficialmente por Auth.js: persiste User/Account en la
  // base, pero la sesión en sí sigue viajando como JWT, no se usa la tabla
  // Session. El login por CredentialsProvider no se ve afectado -ese ya
  // resuelve el User a mano en authorize().
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    // Sin "newUser": ahora que el adapter persiste usuarios de Google de
    // verdad, Auth.js redirige ahí la PRIMERA vez que ve a alguien nuevo
    // -pero /registro es el formulario de alta con email/contraseña, no
    // tiene sentido para quien ya se logueó con Google. Sin esta opción, un
    // usuario nuevo sigue el mismo callbackUrl que cualquier login
    // (login/page.tsx ya manda a Google con callbackUrl: "/").
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? 'REGULAR';
        token.regatistaId = user.regatistaId ?? null;
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
        session.user.role = token.role as 'ADMIN' | 'REGULAR';
        session.user.regatistaId = token.regatistaId as string | null;
      }
      return session;
    },
  },
});
