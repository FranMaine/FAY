import { GoogleGenAI } from '@google/genai';
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
