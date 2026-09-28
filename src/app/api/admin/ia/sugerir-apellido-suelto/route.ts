import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { iaDisponible, pedirJson, IaNoConfiguradaError, errorDeGemini } from '@/lib/ia';
import { armarFichaRegatista, type FichaRegatista } from '@/lib/ia-fichas';
import { permitir } from '@/lib/rate-limit';

export const maxDuration = 60;

const bodySchema = z.object({
  sueltoId: z.string().min(1),
  candidatoIds: z.array(z.string().min(1)).min(1).max(80),
});

const respuestaSchema = z.object({
  candidatoId: z.string().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']),
  motivo: z.string().max(400),
});

// Sugiere a cuál de los candidatos corresponde un regatista cargado solo con
// el apellido. Es solo una SUGERENCIA para el admin: no fusiona nada.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (!iaDisponible()) {
      return NextResponse.json({ error: 'La IA no está configurada todavía.' }, { status: 503 });
    }
    // Tope por minuto: la cuota gratuita de Gemini es de ~5 pedidos por
    // minuto, y el límite por hora solo no lo frena (se pasaba de largo y
    // el usuario veía el error 429 de Google en vez de un aviso claro).
    if (!(await permitir(`ia-sugerir-min:${session.user.id}`, 5, 60 * 1000))) {
      return NextResponse.json({ error: 'Vas muy rápido con la IA. Esperá un minuto y probá de nuevo.' }, { status: 429 });
    }
    if (!(await permitir(`ia-sugerir:${session.user.id}`, 30, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Llegaste al límite de sugerencias por hora. Probá más tarde.' }, { status: 429 });
    }

    const { sueltoId, candidatoIds } = bodySchema.parse(await request.json());
    const [suelto, ...candidatos] = await Promise.all([sueltoId, ...candidatoIds].map(armarFichaRegatista));
    if (!suelto) return NextResponse.json({ error: 'Regatista no encontrado' }, { status: 404 });
    const validos = candidatos.filter((c): c is FichaRegatista => c !== null);
    if (validos.length === 0) return NextResponse.json({ error: 'Sin candidatos válidos' }, { status: 400 });

    const prompt = `Sos un asistente que ayuda a un administrador de un sitio de resultados de vela.
Un regatista fue cargado por error solo con su apellido. Decidí si es la misma persona que alguno de los candidatos (regatistas con nombre completo).

Indicios, de más a menos fuertes: mismo número de vela en el mismo campeonato o clase, mismo club, mismo apellido, campeonatos y clases en común. En clases de dos tripulantes (420, 29er) la vela identifica al bote y NO a la persona, así que una vela igual sola no alcanza si hay dos candidatos con esa vela.
Si no hay evidencia suficiente, respondé candidatoId null. No adivines.

Regatista cargado solo con apellido:
${JSON.stringify(suelto)}

Candidatos:
${JSON.stringify(validos)}

Respondé SOLO un JSON con esta forma:
{"candidatoId": "<id de UN candidato de la lista, o null>", "confianza": "alta" | "media" | "baja", "motivo": "<una o dos frases en español>"}`;

    const respuesta = await pedirJson(prompt, respuestaSchema);
    // El modelo no es confiable: el id devuelto tiene que ser uno de los que mandamos.
    const elegido = validos.find((c) => c.id === respuesta.candidatoId) ?? null;
    return NextResponse.json({
      candidatoId: elegido?.id ?? null,
      candidatoNombre: elegido?.nombre ?? null,
      confianza: elegido ? respuesta.confianza : 'baja',
      motivo: respuesta.motivo,
    });
  } catch (error) {
    if (error instanceof IaNoConfiguradaError) {
      return NextResponse.json({ error: 'La IA no está configurada todavía.' }, { status: 503 });
    }
    const deGemini = errorDeGemini(error);
    if (deGemini) return NextResponse.json({ error: deGemini.mensaje }, { status: deGemini.status });
    return handleApiError(error, 'POST /api/admin/ia/sugerir-apellido-suelto');
  }
}
