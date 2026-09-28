import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { iaDisponible, pedirJson, IaNoConfiguradaError, errorDeGemini } from '@/lib/ia';
import { armarFichaRegatista } from '@/lib/ia-fichas';
import { permitir } from '@/lib/rate-limit';

export const maxDuration = 60;

const bodySchema = z.object({
  aId: z.string().min(1),
  bId: z.string().min(1),
});

const respuestaSchema = z.object({
  mismaPersona: z.boolean(),
  canonicoId: z.string().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']),
  motivo: z.string().max(400),
});

// Sugiere si un par de regatistas de nombre casi idéntico (ver
// sonNombresParecidos en regatista-merge.ts: falta/sobra una palabra, o una
// palabra está mal tipeada) es en realidad la misma persona, y de ser así
// cuál de las dos fichas conviene usar como canónica. Es solo una
// SUGERENCIA para el admin: no fusiona nada.
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

    const { aId, bId } = bodySchema.parse(await request.json());
    const [a, b] = await Promise.all([armarFichaRegatista(aId), armarFichaRegatista(bId)]);
    if (!a || !b) return NextResponse.json({ error: 'Regatista no encontrado' }, { status: 404 });

    const prompt = `Sos un asistente que ayuda a un administrador de un sitio de resultados de vela.
Dos fichas de regatista tienen nombres casi idénticos (a una le falta o le sobra una palabra respecto de la otra, o una palabra está mal tipeada). Decidí si son la MISMA persona real cargada dos veces, o dos personas distintas que solo comparten parte del nombre (ej: hermanos, o coincidencia de apellido).

Indicios de que son la misma persona: mismo club, mismo número de vela en el mismo campeonato o clase, campeonatos y clases en común, un nombre que es un subconjunto casi exacto del otro. Indicios de que son personas distintas: clubes distintos sin relación, participaciones que no se superponen para nada, o una diferencia de nombre que parece un nombre de pila distinto (no un typo).
En clases de dos tripulantes (420, 29er) la vela identifica al bote y NO a la persona.
Si no hay evidencia suficiente para decidir, respondé mismaPersona false. No adivines.

Si son la misma persona, elegí como canónica la ficha con el nombre más completo/correcto, o si son iguales de completas la que tenga más resultados.

Ficha A:
${JSON.stringify(a)}

Ficha B:
${JSON.stringify(b)}

Respondé SOLO un JSON con esta forma:
{"mismaPersona": true o false, "canonicoId": "<id de A o de B si mismaPersona es true, si no null>", "confianza": "alta" | "media" | "baja", "motivo": "<una o dos frases en español>"}`;

    const respuesta = await pedirJson(prompt, respuestaSchema);
    // El modelo no es confiable: el id devuelto tiene que ser A o B.
    const canonicoValido = respuesta.canonicoId === a.id || respuesta.canonicoId === b.id ? respuesta.canonicoId : null;
    const mismaPersona = respuesta.mismaPersona && !!canonicoValido;
    return NextResponse.json({
      mismaPersona,
      canonicoId: mismaPersona ? canonicoValido : null,
      confianza: mismaPersona ? respuesta.confianza : 'baja',
      motivo: respuesta.motivo,
    });
  } catch (error) {
    if (error instanceof IaNoConfiguradaError) {
      return NextResponse.json({ error: 'La IA no está configurada todavía.' }, { status: 503 });
    }
    const deGemini = errorDeGemini(error);
    if (deGemini) return NextResponse.json({ error: deGemini.mensaje }, { status: deGemini.status });
    return handleApiError(error, 'POST /api/admin/ia/sugerir-nombre-parecido');
  }
}
