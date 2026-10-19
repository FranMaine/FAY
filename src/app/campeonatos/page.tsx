import { Metadata } from "next";
import { CampeonatosAgrupados } from "@/components/ui/campeonatos-agrupados";
import { getFiltrosBase, getListaCampeonatos } from "@/lib/campeonatos-lista";
import { RankingFilters } from "@/components/filters/ranking-filters";
import { AlertCircleIcon } from "lucide-react";
import { coincidePorPalabras } from "@/lib/busqueda-texto";

// Sin "| Orzando" acá: el layout raíz ya lo agrega vía title.template
// -ponerlo también acá duplicaba el sufijo en el <title> real.
export const metadata: Metadata = {
  title: "Campeonatos",
  description: "Explorá todos los campeonatos de vela filtrados por clase y año, con su tabla de posiciones.",
};

export default async function CampeonatosPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;

  const { clases, anios: aniosDb } = await getFiltrosBase();

  const currentYear = new Date().getFullYear();
  const anios = [...aniosDb];
  if (!anios.includes(currentYear)) anios.unshift(currentYear);

  // Agregar una clase artificial para "Todas"
  const allClasses = [{ id: 'ALL', nombre: 'Todas las clases' }, ...clases];
  const allYears = [0, ...anios]; // 0 significará "Todos los años"

  const activeClaseId = typeof resolvedParams.clase === 'string' ? resolvedParams.clase : 'ALL';
  const busqueda = typeof resolvedParams.q === 'string' ? resolvedParams.q.trim().slice(0, 80) : '';
  // Al buscar por texto sin haber elegido año, se busca en TODOS los años: si
  // no, "Vela Fest" solo encontraría la edición de este año.
  const anioPedido = typeof resolvedParams.anio === 'string' ? parseInt(resolvedParams.anio) : NaN;
  const activeAnio = Number.isNaN(anioPedido) ? (busqueda ? 0 : currentYear) : anioPedido;

  // Solo se consulta la base (cacheada) con una clase y un año que existen:
  // un valor inventado en la URL daría una lista vacía igual, pero sin esto
  // cada valor distinto sería una consulta y una entrada de caché nuevas.
  const filtroValido = allClasses.some((c) => c.id === activeClaseId) && allYears.includes(activeAnio);
  const campeonatosTodos = filtroValido ? await getListaCampeonatos(activeClaseId, activeAnio) : [];

  // Búsqueda por texto (sin importar tildes, mayúsculas ni orden de las
  // palabras): contra el nombre, el evento, la clase, el club sede y el año.
  const campeonatos = (busqueda
    ? campeonatosTodos.filter((c) => coincidePorPalabras(c.textoBusqueda, busqueda))
    : campeonatosTodos
  ).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    evento: c.evento,
    anio: c.anio,
    clase: c.clase,
    sede: c.sede,
    totalRegatistas: c.totalRegatistas,
    estado: c.estado,
    fechaInicio: c.fechaInicio,
    logoUrl: c.logoUrl,
  }));

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Explorador de Campeonatos</h1>
          <p className="text-muted-foreground text-lg">Buscá y filtrá los campeonatos de vela de todo el país</p>
        </header>

        {/* Reusamos el componente de filtros, pasandole los "All" options */}
        <RankingFilters 
          clases={allClasses} 
          anios={allYears as unknown as number[]} 
          currentClaseId={activeClaseId} 
          currentAnio={activeAnio} 
          currentBusqueda={busqueda}
        />

        {/* key con los filtros activos: fuerza a React a tratar esto como
            un nodo nuevo en cada cambio de clase/año (no una actualización
            del mismo), así la entrada de fade-in-up vuelve a jugar en vez
            de que el contenido nuevo aparezca de un salto -mismo criterio
            que cuando se filtra cualquier otra lista del sitio. */}
        {campeonatos.length === 0 ? (
          <div key={`${activeClaseId}-${activeAnio}-${busqueda}`} className="fade-in-up flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-surface/50 text-muted-foreground">
            <AlertCircleIcon className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-lg font-medium">Sin torneos</p>
            <p className="text-sm">
              {busqueda
                ? `No encontramos campeonatos para "${busqueda}" con esos filtros. Probá con otra palabra o cambiá la clase y el año.`
                : 'No se encontraron campeonatos publicados con esos filtros.'}
            </p>
          </div>
        ) : (
          <div key={`${activeClaseId}-${activeAnio}-${busqueda}`} className="fade-in-up">
            <CampeonatosAgrupados campeonatos={campeonatos} />
          </div>
        )}
      </div>
    </main>
  );
}
