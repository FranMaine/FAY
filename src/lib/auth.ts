import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/registro',
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
