import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { registroSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = registroSchema.parse(json);

    // El UNIQUE de email en Postgres es case-sensitive, así que
    // normalizamos: si no, alguien podría registrarse con "Juan@Gmail.com"
    // y otra persona con "juan@gmail.com" -y peor: el primer usuario
    // tampoco podría volver a loguearse si escribe distinto la próxima vez.
    const email = body.email.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(body.password, 10);

    // Intentamos crear directamente y capturamos el error de UNIQUE en
    // vez de un findUnique() previo -así evitamos el race de dos requests
    // concurrentes con el mismo email pasando ambas el check.
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 400 });
    }
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
