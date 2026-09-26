import { Type, type FunctionDeclaration } from '@google/genai';
import { prisma } from '@/lib/db';
import { getRankingGeneral } from '@/lib/ranking-general';
import { clubesConMasPodios } from '@/lib/podios-clubes';
import { buscarCandidatosApellidoSuelto } from '@/lib/regatista-merge';

// Herramientas que el asistente de IA del panel de admin puede llamar. Son
// SOLO LECTURA y con parámetros fijos: el modelo nunca escribe consultas
// libres a la base ni puede modificar nada -elige una herramienta y sus
// argumentos, y el servidor ejecuta la consulta que definimos acá.

export const DECLARACIONES: FunctionDeclaration[] = [
  {
    name: 'estadisticas_generales',
    description: 'Cantidad total de regatistas, clubes, clases y campeonatos (publicados y borradores).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'buscar_regatistas',
    description: 'Busca regatistas por parte del nombre. Devuelve hasta 10 con club, número de vela y cantidad de resultados.',
    parameters: {
      type: Type.OBJECT,
      properties: { nombre: { type: Type.STRING, description: 'Parte del nombre o apellido a buscar' } },
      required: ['nombre'],
    },
  },
  {
    name: 'listar_campeonatos',
    description: 'Lista campeonatos, opcionalmente filtrados por año y/o clase. Devuelve hasta 30 con estado y cantidad de regatas.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        anio: { type: Type.INTEGER, description: 'Año, por ejemplo 2026' },
        clase: { type: Type.STRING, description: 'Nombre de la clase, por ejemplo 420 o ILCA 6' },
      },
    },
  },
  {
    name: 'ranking_clase',
    description: 'Top 10 del ranking general de una clase en un año (anio 0 = todos los años).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        clase: { type: Type.STRING, description: 'Nombre de la clase' },
        anio: { type: Type.INTEGER, description: 'Año, o 0 para todos los años' },
      },
      required: ['clase', 'anio'],
    },
  },
  {
    name: 'clubes_con_mas_podios',
    description: 'Los 10 clubes con más podios (puestos 1 a 3) en campeonatos publicados.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'apellidos_sueltos_pendientes',
    description: 'Regatistas cargados solo con el apellido que todavía esperan revisión, con su cantidad de candidatos.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

async function claseIdPorNombre(nombre: string) {
  const clases = await prisma.clase.findMany({ select: { id: true, nombre: true } });
  const buscado = nombre.trim().toLowerCase();
  return clases.find((c) => c.nombre.toLowerCase() === buscado) ?? clases.find((c) => c.nombre.toLowerCase().includes(buscado)) ?? null;
}

const soloTexto = (v: unknown, max = 80) => String(v ?? '').slice(0, max);

export async function ejecutarHerramienta(nombre: string, args: Record<string, unknown> = {}): Promise<unknown> {
  switch (nombre) {
    case 'estadisticas_generales': {
      const [regatistas, clubes, clases, publicados, borradores] = await Promise.all([
        prisma.regatista.count(),
        prisma.club.count(),
        prisma.clase.count(),
        prisma.campeonato.count({ where: { estado: 'PUBLICADO' } }),
        prisma.campeonato.count({ where: { estado: 'BORRADOR' } }),
      ]);
      return { regatistas, clubes, clases, campeonatosPublicados: publicados, campeonatosBorrador: borradores };
    }
    case 'buscar_regatistas': {
      const q = soloTexto(args.nombre, 60).trim();
      if (q.length < 2) return { error: 'Buscá con al menos 2 letras' };
      const rs = await prisma.regatista.findMany({
        where: { nombre: { contains: q, mode: 'insensitive' } },
        take: 10,
        select: { id: true, nombre: true, fuenteIds: true, club: { select: { nombre: true } }, _count: { select: { resultados: true } } },
      });
      return rs.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        club: r.club?.nombre ?? null,
        vela: (r.fuenteIds as { vela?: string } | null)?.vela ?? null,
        resultados: r._count.resultados,
      }));
    }
    case 'listar_campeonatos': {
      const clase = args.clase ? await claseIdPorNombre(soloTexto(args.clase)) : null;
      if (args.clase && !clase) return { error: `No hay una clase llamada "${soloTexto(args.clase)}"` };
      const anio = Number.isInteger(args.anio) ? (args.anio as number) : undefined;
      const cs = await prisma.campeonato.findMany({
        where: { ...(anio ? { anio } : {}), ...(clase ? { claseId: clase.id } : {}) },
        take: 30,
        orderBy: [{ anio: 'desc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true, anio: true, estado: true, clase: { select: { nombre: true } }, _count: { select: { regatas: true } } },
      });
      return cs.map((c) => ({ id: c.id, nombre: c.nombre, anio: c.anio, clase: c.clase.nombre, estado: c.estado, regatas: c._count.regatas }));
    }
    case 'ranking_clase': {
      const clase = await claseIdPorNombre(soloTexto(args.clase));
      if (!clase) return { error: `No hay una clase llamada "${soloTexto(args.clase)}"` };
      const anio = Number.isInteger(args.anio) ? (args.anio as number) : 0;
      const ranking = await getRankingGeneral(clase.id, anio);
      return { clase: clase.nombre, anio, top: ranking.slice(0, 10).map((r, i) => ({ puesto: i + 1, nombre: r.nombre, club: r.club, puntos: r.puntosRanking, campeonatos: r.campeonatos })) };
    }
    case 'clubes_con_mas_podios':
      return (await clubesConMasPodios(10)).map((c) => ({ club: c.nombre, podios: c.podios, victorias: c.victorias }));
    case 'apellidos_sueltos_pendientes': {
      const l = await buscarCandidatosApellidoSuelto();
      return { total: l.length, primeros: l.slice(0, 15).map((x) => ({ apellido: x.suelto.nombre, club: x.suelto.club, candidatos: x.candidatos.length })) };
    }
    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}
