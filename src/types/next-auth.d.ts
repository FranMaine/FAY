import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: 'ADMIN' | 'ORGANIZADOR' | 'REGULAR';
    regatistaId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'ADMIN' | 'ORGANIZADOR' | 'REGULAR';
      regatistaId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'ORGANIZADOR' | 'REGULAR';
    regatistaId: string | null;
  }
}
