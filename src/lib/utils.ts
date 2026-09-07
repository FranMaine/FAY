import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extrae un mensaje legible de lo que sea que haya caído en un catch(). Los
 * componentes cliente hacen fetch() y necesitan mostrar el error en
 * pantalla, pero TypeScript tipa el catch como `unknown` -esto evita
 * repetir el mismo `err instanceof Error ? err.message : '...'` en cada
 * handler, y el `any` que eso reemplazaba en varios componentes.
 */
export function mensajeDeError(err: unknown, fallback = 'Ocurrió un error'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
