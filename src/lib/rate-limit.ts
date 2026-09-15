// Limitador de tasa simple, en memoria, por IP -pensado para frenar abuso
// básico (spam de registros, o que alguien use "olvidé mi contraseña" para
// mandar mail en cadena a direcciones ajenas) sin depender de Redis ni de
// ningún servicio externo.
//
// OJO con la limitación real de esto: en un entorno serverless (Vercel)
// cada instancia tiene su propia memoria, así que dos requests que caen en
// instancias distintas no comparten contador -no es un límite exacto ni a
// prueba de un atacante distribuido. Sirve igual como primera barrera
// contra bots/spam simple (el caso real que nos importa acá), no como
// defensa contra un ataque dirigido -para eso hace falta un store
// compartido (ej: Redis/Upstash), fuera de alcance por ahora.
const intentos = new Map<string, number[]>();

// Limpieza periódica para no acumular entradas viejas para siempre en el
// Map -sin esto, cada IP que probó una vez el formulario queda en memoria
// hasta que se reinicia la instancia.
const LIMPIEZA_INTERVALO_MS = 10 * 60 * 1000;
let ultimaLimpieza = Date.now();

function limpiarViejos(ahora: number) {
  if (ahora - ultimaLimpieza < LIMPIEZA_INTERVALO_MS) return;
  ultimaLimpieza = ahora;
  for (const [key, marcas] of intentos) {
    if (marcas.every((t) => ahora - t > LIMPIEZA_INTERVALO_MS)) intentos.delete(key);
  }
}

/**
 * Sliding window: permite como máximo `limite` llamados por `key` dentro de
 * los últimos `ventanaMs` milisegundos. Devuelve true si esta llamada está
 * permitida (y la registra); false si hay que rechazarla.
 */
export function permitir(key: string, limite: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  limpiarViejos(ahora);

  const marcas = (intentos.get(key) ?? []).filter((t) => ahora - t < ventanaMs);
  if (marcas.length >= limite) {
    intentos.set(key, marcas);
    return false;
  }
  marcas.push(ahora);
  intentos.set(key, marcas);
  return true;
}

/** IP del request, tal como la ve el server detrás del proxy/CDN. */
export function ipDeRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconocida';
}
