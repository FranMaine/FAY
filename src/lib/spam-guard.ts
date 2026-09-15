// Protección anti-spam básica para formularios públicos (registro, "olvidé
// mi contraseña"): un campo trampa ("honeypot") invisible para una persona
// real pero que un bot que completa todos los inputs de un formulario sí
// llena, más un chequeo de tiempo mínimo entre que se mostró el formulario
// y se mandó (un bot suele enviar en milisegundos, una persona tarda al
// menos un par de segundos en escribir). Ninguna de las dos cosas molesta
// a un usuario real ni requiere un servicio externo (reCAPTCHA/Turnstile),
// a costa de no frenar un bot hecho a medida para este formulario puntual
// -es una primera barrera contra spam genérico, no una garantía.
export interface DatosAntiSpam {
  // Nombre del campo trampa: debe viajar vacío. Se sugiere un nombre que
  // suene a campo real ("sitioWeb", "empresa") para que un bot que
  // autocompleta todo lo que encuentra caiga más fácil.
  trampa?: string;
  // Timestamp (Date.now()) de cuando se montó el formulario, mandado como
  // campo oculto normal (no trampa).
  montadoEn?: number;
}

const TIEMPO_MINIMO_MS = 1500;

export function pareceSpam(datos: DatosAntiSpam): boolean {
  if (datos.trampa && datos.trampa.trim().length > 0) return true;
  if (typeof datos.montadoEn === 'number' && Date.now() - datos.montadoEn < TIEMPO_MINIMO_MS) return true;
  return false;
}
