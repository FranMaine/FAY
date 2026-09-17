import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Manejo uniforme de errores para catch() en rutas de API. Antes, todas las
 * rutas devolvían "Internal Server Error" (500) para CUALQUIER excepción,
 * incluida una validación de Zod que falla porque el admin mandó un puesto
 * negativo o similar -Zod ya trae el mensaje exacto de qué está mal, pero
 * se descartaba y el usuario solo veía un 500 genérico sin pista de qué
 * corregir.
 */
export function handleApiError(error: unknown, contexto: string): NextResponse {
  if (error instanceof ZodError) {
    const primero = error.issues[0];
    const campo = primero?.path?.length ? `${primero.path.join('.')}: ` : '';
    return NextResponse.json({ error: `${campo}${primero?.message || 'Datos inválidos'}` }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con ese valor único' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
  }

  console.error(`[${contexto}]`, error);
  // Además de la consola (que en producción nadie mira en vivo), un
  // registro persistente en la propia base -sin esto, la única forma de
  // enterarse de que algo rompió en producción era que un usuario
  // escribiera para avisar. No usamos un servicio externo (Sentry, etc.)
  // porque hace falta una cuenta/DSN que no tenemos; esto da monitoreo
  // real sin depender de eso. "void" + catch propio: loggear el error NO
  // puede ser la causa de que la respuesta de error falle a su vez.
  void registrarError(contexto, error);

  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
}

async function registrarError(contexto: string, error: unknown) {
  try {
    const mensaje = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    await prisma.errorLog.create({ data: { contexto, mensaje, stack } });
  } catch (errorAlLoguear) {
    // Si esto falla (ej: la base no responde, que es justo el tipo de
    // cosa que querríamos loggear) no hay a dónde escalarlo más que la
    // consola -no puede tirar, ya estamos adentro del manejo de errores.
    console.error('[api-error] no se pudo persistir el ErrorLog', errorAlLoguear);
  }
}
