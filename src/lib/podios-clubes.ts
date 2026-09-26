import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { generarClasificacion, agruparPorRegatista } from '@/lib/scoring';

export interface ClubConPodios {
  id: string;
  nombre: string;
  logoUrl: string | null;
  podios: number;
  victorias: number;
}

// Cuántos podios (puestos 1 a 3 en la clasificación final de un campeonato
// publicado) sumaron los regatistas de cada club, contando también a
// quienes lo tienen como club secundario (doble club), igual que el
// ranking de clubes. Cada regatista cuenta una vez por campeonato.
async function calcularClubesConMasPodios(limite: number): Promise<ClubConPodios[]> {
  const [campeonatos, clubes] = await Promise.all([
    prisma.campeonato.findMany({
      where: { estado: 'PUBLICADO' },
      include: {
        regatas: {
          include: {
            resultados: { include: { regatista: { include: { club: true, otrosClubes: true } } } },
          },
        },
      },
    }),
    prisma.club.findMany({ select: { id: true, nombre: true, logoUrl: true } }),
  ]);

  const clubPorId = new Map(clubes.map((c) => [c.id, c]));
  const idPorNombre = new Map(clubes.map((c) => [c.nombre, c.id]));
  const acumulado = new Map<string, { podios: number; victorias: number }>();

  for (const camp of campeonatos) {
    const otros = new Map<string, string[]>();
    for (const regata of camp.regatas) {
      for (const res of regata.resultados) {
        if (res.regatista.otrosClubes.length) {
          otros.set(res.regatista.id, res.regatista.otrosClubes.map((c) => c.id));
        }
      }
    }

    for (const fila of generarClasificacion(agruparPorRegatista(camp.regatas), camp.descartes)) {
      if (fila.posicionFinal > 3) continue;
      const ids = new Set<string>(otros.get(fila.regatistaId) ?? []);
      const principal = fila.club ? idPorNombre.get(fila.club) : undefined;
      if (principal) ids.add(principal);
      for (const id of ids) {
        const a = acumulado.get(id) ?? { podios: 0, victorias: 0 };
        a.podios += 1;
        if (fila.posicionFinal === 1) a.victorias += 1;
        acumulado.set(id, a);
      }
    }
  }

  return [...acumulado.entries()]
    .map(([id, a]) => ({ id, nombre: clubPorId.get(id)!.nombre, logoUrl: clubPorId.get(id)!.logoUrl, ...a }))
    .sort((a, b) => b.podios - a.podios || b.victorias - a.victorias || a.nombre.localeCompare(b.nombre))
    .slice(0, limite);
}

// Mismo esquema de caché que los rankings: 1 hora, y se invalida al
// momento con revalidateTag('rankings') cuando cambian los resultados.
export const clubesConMasPodios = unstable_cache(calcularClubesConMasPodios, ['clubes-mas-podios'], {
  revalidate: 3600,
  tags: ['rankings'],
});
