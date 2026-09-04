import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

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
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
}
