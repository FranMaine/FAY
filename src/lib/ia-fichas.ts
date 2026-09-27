import { prisma } from '@/lib/db';

export interface FichaRegatista {
  id: string;
  nombre: string;
  club: string | null;
  vela: string | null;
  participaciones: string[];
}

// Ficha compacta y SIN datos personales más allá de lo que ya es público en
// el sitio (nombre, club, número de vela, campeonatos donde compitió) -la
// usan las rutas que le piden una sugerencia a la IA sobre posibles
// duplicados (apellido suelto, nombre parecido).
export async function armarFichaRegatista(id: string): Promise<FichaRegatista | null> {
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
