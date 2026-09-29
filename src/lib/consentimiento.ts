"use client";

// Consentimiento de cookies no esenciales (analítica, publicidad). Vive en
// localStorage, no en una cookie -así el propio hecho de "todavía no elegiste"
// no genera tráfico de cookies antes de que el visitante decida algo.
//
// "necesarias" no es una opción real (siempre true): son las que hacen
// falta para que el login funcione (ver /cookies), y esas no dependen de
// consentimiento porque son estrictamente necesarias para el servicio que
// el usuario pidió (excepción reconocida por la normativa de cookies).
export interface Consentimiento {
  necesarias: true;
  analitica: boolean;
  publicidad: boolean;
  decididoEn: string;
}

const CLAVE_STORAGE = "fay-consentimiento";
const EVENTO_CAMBIO = "fay-consentimiento-cambio";

export function leerConsentimiento(): Consentimiento | null {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return null;
    const parsed = JSON.parse(crudo);
    if (typeof parsed?.analitica !== "boolean" || typeof parsed?.publicidad !== "boolean") return null;
    return { necesarias: true, analitica: parsed.analitica, publicidad: parsed.publicidad, decididoEn: parsed.decididoEn };
  } catch {
    return null;
  }
}

export function guardarConsentimiento(eleccion: { analitica: boolean; publicidad: boolean }): void {
  const valor: Consentimiento = { necesarias: true, ...eleccion, decididoEn: new Date().toISOString() };
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(valor));
  } catch {
    // Sin storage disponible, el banner va a volver a aparecer en la
    // próxima visita -degradación aceptable, no rompe nada.
  }
  // Los componentes que cargan analítica/publicidad (todavía no existen,
  // se suman cuando haya cuenta de Google Analytics/AdSense) escuchan este
  // evento para activarse sin necesidad de recargar la página apenas el
  // visitante acepta.
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: valor }));
}

export function alCambiarConsentimiento(cb: (c: Consentimiento) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Consentimiento>).detail);
  window.addEventListener(EVENTO_CAMBIO, handler);
  return () => window.removeEventListener(EVENTO_CAMBIO, handler);
}
