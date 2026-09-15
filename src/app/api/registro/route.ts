import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { registroSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/api-error';
import { permitir, ipDeRequest } from '@/lib/rate-limit';
import { pareceSpam } from '@/lib/spam-guard';

export async function POST(request: Request) {
  try {
    // A lo sumo 5 altas de cuenta por IP cada 10 minutos -no molesta a una
    // persona real (que se registra una sola vez) pero frena un script que
    // intenta crear cuentas en cadena.
    if (!permitir(`registro:${ipDeRequest(request)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
    }

    const json = await request.json();

    // Honeypot + tiempo mínimo de carga: si esto tira spam, respondemos
    // como si hubiera salido todo bien (200 con un user falso descartado
    // en silencio) en vez de un error -así un bot no aprende a distinguir
    // "detectado" de "éxito" y no ajusta su comportamiento.
    if (pareceSpam({ trampa: json.sitioWeb, montadoEn: json.montadoEn })) {
      return NextResponse.json({ id: 'ok', name: json.name ?? '', email: json.email ?? '', role: 'REGULAR' }, { status: 201 });
    }

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
    // Mensaje más específico que el genérico de handleApiError para este
    // caso puntual (es, por lejos, el motivo más común de que falle el
    // registro).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 400 });
    }
    return handleApiError(error, 'POST /api/registro');
  }
}
