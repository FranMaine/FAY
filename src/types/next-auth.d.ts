import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: 'ADMIN' | 'REGULAR';
    regatistaId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'ADMIN' | 'REGULAR';
      regatistaId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'REGULAR';
    regatistaId: string | null;
  }
}
