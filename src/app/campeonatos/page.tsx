import { Metadata } from "next";
import { CampeonatoCard } from "@/components/ui/campeonato-card";
import prisma from "@/lib/db";

export const metadata: Metadata = {
  title: "Campeonatos | FAY Stats",
  description: "Explora los campeonatos de la vela argentina",
};

export default async function CampeonatosPage() {
  const campeonatosDb = await prisma.campeonato.findMany({
    where: { estado: 'PUBLICADO' },
    include: {
      clase: true,
      sede: true,
      _count: {
        select: { regatas: true },
      },
    },
    orderBy: [
      { anio: 'desc' },
      { nombre: 'asc' },
    ],
  });

  const campeonatos = campeonatosDb.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    anio: c.anio,
    clase: c.clase.nombre,
    sede: c.sede?.nombre || 'Sede FAY',
    totalRegatistas: 18,
    estado: c.estado,
    fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString().split('T')[0] : `${c.anio}-01-01`,
  }));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Campeonatos</h1>
          <p className="text-muted-foreground text-lg">Buscá y filtrá los campeonatos oficiales de la Federación Argentina de Yachting</p>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campeonatos.map((campeonato) => (
            <CampeonatoCard key={campeonato.id} campeonato={campeonato} />
          ))}
        </div>
      </div>
    </main>
  );
}
