import { prisma } from '@/lib/db';

/**
 * Limitador de tasa por ventana fija, respaldado en Postgres (tabla
 * RateLimitEntry) -pensado para frenar abuso básico (spam de registros, o
 * que alguien use "olvidé mi contraseña" para mandar mail en cadena a
 * direcciones ajenas) sin depender de un servicio externo (Redis/Upstash).
 *
 * Antes esto vivía en un Map en memoria del proceso. Funcionaba en un
 * servidor de un solo proceso, pero en un entorno serverless (Vercel) cada
 * instancia tiene su propia memoria -dos requests que caían en instancias
 * distintas no veían el intento la una de la otra, así que el límite real
 * terminaba siendo "N intentos por instancia", no "N intentos por IP/
 * email" como se pretendía. Guardarlo en la misma base Postgres que ya usa
 * toda la app lo hace consistente entre instancias sin sumar
 * infraestructura nueva.
 *
 * No es perfectamente atómico bajo carga concurrente muy alta (hay una
 * lectura y después una escritura, no un solo UPDATE atómico) -aceptable
 * acá: es una barrera contra abuso, no un mecanismo de facturación donde
 * una carrera de milisegundos importe.
 */
export async function permitir(key: string, limite: number, ventanaMs: number): Promise<boolean> {
  const ahora = new Date();

  const entry = await prisma.rateLimitEntry.findUnique({ where: { clave: key } });

  if (!entry || ahora.getTime() - entry.ventanaInicio.getTime() > ventanaMs) {
    // No hay entrada, o la ventana anterior ya venció -arranca una nueva
    // ventana con un solo intento (este).
    await prisma.rateLimitEntry.upsert({
      where: { clave: key },
      create: { clave: key, intentos: 1, ventanaInicio: ahora },
      update: { intentos: 1, ventanaInicio: ahora },
    });
    limpiarViejosOcasionalmente();
    return true;
  }

  if (entry.intentos >= limite) return false;

  await prisma.rateLimitEntry.update({ where: { clave: key }, data: { intentos: { increment: 1 } } });
  return true;
}

// Limpieza oportunista de entradas viejas -sin un cron job dedicado, se
// aprovecha alguna llamada de tanto en tanto (1 de cada ~50) para no dejar
// crecer la tabla para siempre con ventanas ya vencidas hace rato. No
// importa perderse una limpieza puntual: la próxima que "toque" la hace
// igual.
const UNA_HORA_MS = 60 * 60 * 1000;
function limpiarViejosOcasionalmente() {
  if (Math.random() > 0.02) return;
  const limite = new Date(Date.now() - UNA_HORA_MS);
  prisma.rateLimitEntry.deleteMany({ where: { ventanaInicio: { lt: limite } } }).catch(() => {
    // No pasa nada si esto falla -es housekeeping, no una operación crítica.
  });
}

/** IP del request, tal como la ve el server detrás del proxy/CDN. */
export function ipDeRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconocida';
}
