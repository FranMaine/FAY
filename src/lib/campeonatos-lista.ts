import { unstable_cache } from "next/cache";
import { Prisma, type EstadoCampeonato } from "@prisma/client";
import { prisma } from "@/lib/db";

// Lecturas de /campeonatos y /rankings que no dependen del visitante. Esas
// páginas leen searchParams, así que Next las renderiza en cada visita: sin
// cachear estas consultas, cada visita (o bot con un filtro distinto) le pega
// a la base. Mismo esquema que getRankingGeneral: se guarda unos minutos y se
// invalida al toque con revalidateTag("rankings") cuando algo publicable
// cambia (ver /api/campeonatos y /api/regatas).

async function leerFiltrosBase() {
  const [clases, anios] = await Promise.all([
    prisma.clase.findMany({ orderBy: { nombre: "asc" } }),
    prisma.campeonato.findMany({
      select: { anio: true },
      distinct: ["anio"],
      orderBy: { anio: "desc" },
    }),
  ]);
  return { clases, anios: anios.map((c) => c.anio) };
}

// Clases y años disponibles para los selectores de filtro.
export const getFiltrosBase = unstable_cache(leerFiltrosBase, ["filtros-base"], {
  revalidate: 300,
  tags: ["rankings"],
});

export interface CampeonatoLista {
  id: string;
  nombre: string;
  evento: string | null;
  anio: number;
  clase: string;
  sede: string;
  totalRegatistas: number;
  estado: EstadoCampeonato;
  fechaInicio: string;
  logoUrl: string | null;
  // Texto contra el que busca el buscador de /campeonatos (nombre, evento,
  // clase, sede y año) -viaja con la fila para filtrar en memoria sin otra
  // consulta.
  textoBusqueda: string;
}

async function leerListaCampeonatos(claseId: string, anio: number): Promise<CampeonatoLista[]> {
  const where: Prisma.CampeonatoWhereInput = {
    estado: "PUBLICADO",
    ...(claseId !== "ALL" ? { claseId } : {}),
    ...(anio !== 0 ? { anio } : {}),
  };

  const campeonatos = await prisma.campeonato.findMany({
    where,
    select: {
      id: true,
      nombre: true,
      evento: true,
      anio: true,
      estado: true,
      fechaInicio: true,
      logoUrl: true,
      clase: { select: { nombre: true } },
      sede: { select: { nombre: true, nombreCompleto: true } },
    },
    orderBy: [{ anio: "desc" }, { nombre: "asc" }],
  });
  if (campeonatos.length === 0) return [];

  // Cantidad de regatistas ÚNICOS por campeonato, contada en la base: antes se
  // traía (regatistaId, campeonatoId) de CADA resultado y se deduplicaba en
  // memoria -con "todos los años" eran decenas de miles de filas por visita
  // para devolver un número por campeonato.
  const conteos = await prisma.$queryRaw<{ id: string; total: number }[]>(Prisma.sql`
    SELECT r."campeonatoId" AS id, COUNT(DISTINCT res."regatistaId")::int AS total
    FROM "Resultado" res
    JOIN "Regata" r ON r.id = res."regataId"
    WHERE r."campeonatoId" IN (${Prisma.join(campeonatos.map((c) => c.id))})
    GROUP BY r."campeonatoId"
  `);
  const totalPorCampeonato = new Map(conteos.map((c) => [c.id, c.total]));

  return campeonatos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    evento: c.evento,
    anio: c.anio,
    clase: c.clase.nombre,
    sede: c.sede?.nombre || "Sin sede",
    totalRegatistas: totalPorCampeonato.get(c.id) ?? 0,
    estado: c.estado,
    fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString().split("T")[0] : `${c.anio}-01-01`,
    logoUrl: c.logoUrl,
    textoBusqueda: [c.nombre, c.evento, c.clase.nombre, c.sede?.nombre, c.sede?.nombreCompleto, c.anio]
      .filter(Boolean)
      .join(" "),
  }));
}

// Campeonatos publicados de una clase ("ALL" = todas) y año (0 = todos).
export const getListaCampeonatos = unstable_cache(leerListaCampeonatos, ["lista-campeonatos"], {
  revalidate: 300,
  tags: ["rankings"],
});
