import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { iaDisponible, pedirJson, IaNoConfiguradaError } from '@/lib/ia';
import { permitir } from '@/lib/rate-limit';

export const maxDuration = 30;

const bodySchema = z.object({
  sueltoId: z.string().min(1),
  candidatoIds: z.array(z.string().min(1)).min(1).max(80),
});

const respuestaSchema = z.object({
  candidatoId: z.string().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']),
  motivo: z.string().max(400),
});

type Ficha = {
  id: string;
  nombre: string;
  club: string | null;
  vela: string | null;
  participaciones: string[];
};

// Ficha compacta y SIN datos personales más allá de lo que ya es público en
// el sitio (nombre, club, número de vela, campeonatos donde compitió).
async function armarFicha(id: string): Promise<Ficha | null> {
  const r = await prisma.regatista.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      fuenteIds: true,
      club: { select: { nombre: true } },
      resultados: {
        select: { regata: { select: { campeonato: { select: { nombre: true, anio: true, clase: { select: { nombre: true } } } } } } },
        take: 200,
      },
    },
  });
  if (!r) return null;
  const vistos = new Set<string>();
  for (const x of r.resultados) {
    const c = x.regata.campeonato;
    vistos.add(`${c.nombre} ${c.anio} (${c.clase.nombre})`);
  }
  return {
    id: r.id,
    nombre: r.nombre,
    club: r.club?.nombre ?? null,
    vela: (r.fuenteIds as { vela?: string } | null)?.vela ?? null,
    participaciones: [...vistos].slice(0, 12),
  };
}

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
    if (!(await permitir(`ia-sugerir:${session.user.id}`, 30, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Llegaste al límite de sugerencias por hora. Probá más tarde.' }, { status: 429 });
    }

    const { sueltoId, candidatoIds } = bodySchema.parse(await request.json());
    const [suelto, ...candidatos] = await Promise.all([sueltoId, ...candidatoIds].map(armarFicha));
    if (!suelto) return NextResponse.json({ error: 'Regatista no encontrado' }, { status: 404 });
    const validos = candidatos.filter((c): c is Ficha => c !== null);
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
    return handleApiError(error, 'POST /api/admin/ia/sugerir-apellido-suelto');
  }
}
