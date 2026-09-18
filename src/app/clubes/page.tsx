import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ClubSearch } from "@/components/search/club-search";

export const metadata: Metadata = {
  title: "Clubes",
  description: "Buscá clubes náuticos afiliados a la Federación Argentina de Yachting y consultá sus estadísticas de regatistas y resultados.",
};

// A diferencia de /rankings o /campeonatos (que además leen searchParams,
// una API dinámica que ya los saca de la generación estática en build),
// esta página no tiene ningún parámetro -sin forzar esto, "next build"
// intenta pre-renderizarla UNA vez con la base disponible en ese momento
// y la deja estática para siempre. force-dynamic la recalcula en cada
// request en su lugar, así un club recién fusionado/creado desde el admin
// aparece al toque; es una sola consulta liviana (180 clubes), no hace
// falta el cacheo de un revalidate acá.
export const dynamic = 'force-dynamic';

async function getClubes() {
  const clubes = await prisma.club.findMany({
    include: { _count: { select: { regatistas: true, regatistasSecundarios: true } } },
  });
  // Los que tienen más regatistas primero -son los que alguien más
  // probablemente busca, y evita que la grilla arranque con clubes vacíos
  // o con nombres-combo de baja calidad (ver auditoría de datos) antes que
  // los clubes reales grandes.
  return clubes
    .map((c) => ({ id: c.id, nombre: c.nombre, ciudad: c.ciudad, logoUrl: c.logoUrl, nombreCompleto: c.nombreCompleto, regatistasCount: c._count.regatistas + c._count.regatistasSecundarios }))
    .sort((a, b) => b.regatistasCount - a.regatistasCount || a.nombre.localeCompare(b.nombre));
}

export default async function ClubesPage() {
  const clubes = await getClubes();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Clubes</h1>
          <p className="text-muted-foreground text-lg">
            {clubes.length} clubes con regatistas cargados en el sistema.
          </p>
        </header>

        <ClubSearch clubes={clubes} />
      </div>
    </main>
  );
}
