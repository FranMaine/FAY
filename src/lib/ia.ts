import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Conexión a Gemini. Solo se usa desde rutas de servidor (la clave nunca
// llega al navegador) y siempre después de verificar que el usuario es ADMIN.
// GEMINI_MODEL permite cambiar de modelo sin tocar código si Google retira
// o renombra el actual.
export const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export class IaRespuestaInvalidaError extends Error {
  constructor(motivo: string) {
    super(motivo);
  }
}

export class IaNoConfiguradaError extends Error {
  constructor() {
    super('La IA no está configurada (falta GEMINI_API_KEY)');
  }
}

/**
 * Reintenta ante errores pasajeros de Gemini (503 saturado, 500 interno):
 * hasta 2 reintentos con 1 s y 2 s de espera. Los demás errores (clave,
 * modelo, cuota) no se reintentan porque volverían a fallar igual.
 */
export async function conReintentos<T>(fn: () => Promise<T>): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await fn();
    } catch (error) {
      const pasajero = error instanceof ApiError && (error.status === 503 || error.status === 500);
      if (!pasajero || intento >= 2) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (intento + 1)));
    }
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
  const respuesta = await conReintentos(() =>
    ai.models.generateContent({
      model: MODELO,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 1024 },
    })
  );

  const texto = respuesta.text;
  if (!texto) throw new IaRespuestaInvalidaError('La IA no devolvió respuesta. Probá de nuevo.');
  // Si el modelo se queda sin tokens a mitad de la respuesta, el JSON llega
  // cortado y JSON.parse explota con un error críptico.
  if (respuesta.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new IaRespuestaInvalidaError('La respuesta de la IA se cortó por ser demasiado larga. Probá de nuevo.');
  }
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new IaRespuestaInvalidaError('La IA devolvió una respuesta que no se pudo leer. Probá de nuevo.');
  }
  return esquema.parse(json);
}

/**
 * Traduce un error de la API de Gemini a un mensaje útil para el admin (y lo
 * deja en el log del servidor). Devuelve null si el error no es de Gemini.
 */
export function errorDeGemini(error: unknown): { mensaje: string; status: number } | null {
  if (error instanceof IaRespuestaInvalidaError) return { status: 502, mensaje: error.message };
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
  if (error.status === 503) {
    return { status: 503, mensaje: 'Los servidores de Gemini están saturados en este momento. Probá de nuevo en un minuto.' };
  }
  return { status: 502, mensaje: `Gemini respondió con un error (${error.status}). Probá de nuevo en un momento.` };
}
