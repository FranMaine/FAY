import { Metadata } from "next";
import { CampeonatoCard } from "@/components/ui/campeonato-card";
import prisma from "@/lib/db";
import { RankingFilters } from "@/components/filters/ranking-filters";
import { AlertCircleIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Campeonatos | FAY Stats",
  description: "Explorá los campeonatos de la vela argentina",
};

export default async function CampeonatosPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;

  const clases = await prisma.clase.findMany({ orderBy: { nombre: 'asc' } });
  
  const currentYear = new Date().getFullYear();
  const campeonatosAnios = await prisma.campeonato.findMany({
    select: { anio: true },
    distinct: ['anio'],
    orderBy: { anio: 'desc' }
  });
  const anios = campeonatosAnios.map(c => c.anio);
  if (!anios.includes(currentYear)) anios.unshift(currentYear);

  // Agregar una clase artificial para "Todas"
  const allClasses = [{ id: 'ALL', nombre: 'Todas las clases' }, ...clases];
  const allYears = [0, ...anios]; // 0 significará "Todos los años"

  let activeClaseId = typeof resolvedParams.clase === 'string' ? resolvedParams.clase : 'ALL';
  let activeAnio = typeof resolvedParams.anio === 'string' ? parseInt(resolvedParams.anio) : currentYear;

  // Construir clausula WHERE
  const whereClause: any = { estado: 'PUBLICADO' };
  if (activeClaseId !== 'ALL') {
    whereClause.claseId = activeClaseId;
  }
  if (activeAnio !== 0) {
    whereClause.anio = activeAnio;
  }

  const campeonatosDb = await prisma.campeonato.findMany({
    where: whereClause,
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
    totalRegatistas: 0, // Ideally we would count unique regatistas here, but leaving 0 is fine for MVP Card UI
    estado: c.estado,
    fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString().split('T')[0] : `${c.anio}-01-01`,
  }));

  const formatYearOption = (y: number) => y === 0 ? "Todos los años" : y.toString();
  const aniosString = allYears.map(formatYearOption);

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Explorador de Campeonatos</h1>
          <p className="text-muted-foreground text-lg">Buscá y filtrá los campeonatos oficiales de la Federación Argentina de Yachting</p>
        </header>

        {/* Reusamos el componente de filtros, pasandole los "All" options */}
        <RankingFilters 
          clases={allClasses} 
          anios={allYears as unknown as number[]} 
          currentClaseId={activeClaseId} 
          currentAnio={activeAnio} 
        />

        {campeonatos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-surface/50 text-muted-foreground">
            <AlertCircleIcon className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-lg font-medium">Sin torneos</p>
            <p className="text-sm">No se encontraron campeonatos publicados con esos filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {campeonatos.map((campeonato) => (
              <CampeonatoCard key={campeonato.id} campeonato={campeonato} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
