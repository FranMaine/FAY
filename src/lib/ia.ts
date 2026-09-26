import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Conexión a Gemini. Solo se usa desde rutas de servidor (la clave nunca
// llega al navegador) y siempre después de verificar que el usuario es ADMIN.
// GEMINI_MODEL permite cambiar de modelo sin tocar código si Google retira
// o renombra el actual.
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export class IaNoConfiguradaError extends Error {
  constructor() {
    super('La IA no está configurada (falta GEMINI_API_KEY)');
  }
}

export function iaDisponible(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Pide una respuesta en JSON y la valida con Zod: lo que devuelve el modelo
 * es texto no confiable, así que nunca se usa sin pasar por el esquema.
 */
export async function pedirJson<T extends z.ZodType>(prompt: string, esquema: T): Promise<z.infer<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new IaNoConfiguradaError();

  const ai = new GoogleGenAI({ apiKey });
  const respuesta = await ai.models.generateContent({
    model: MODELO,
    contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 600 },
  });

  const texto = respuesta.text;
  if (!texto) throw new Error('La IA no devolvió respuesta');
  return esquema.parse(JSON.parse(texto));
}

/**
 * Traduce un error de la API de Gemini a un mensaje útil para el admin (y lo
 * deja en el log del servidor). Devuelve null si el error no es de Gemini.
 */
export function errorDeGemini(error: unknown): { mensaje: string; status: number } | null {
  if (!(error instanceof ApiError)) return null;
  console.error('[gemini]', error.status, error.message);
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    return { status: 502, mensaje: 'Google rechazó la clave o la solicitud. Revisá que GEMINI_API_KEY esté bien copiada y habilitada.' };
  }
  if (error.status === 404) {
    return { status: 502, mensaje: `El modelo "${MODELO}" no existe o no está disponible. Cargá GEMINI_MODEL en Vercel con un modelo vigente de AI Studio.` };
  }
  if (error.status === 429) {
    return { status: 429, mensaje: 'Llegaste al límite gratuito de Gemini (por minuto o por día). Probá de nuevo más tarde.' };
  }
  return { status: 502, mensaje: `Gemini respondió con un error (${error.status}). Probá de nuevo en un momento.` };
}
