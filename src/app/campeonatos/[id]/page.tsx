import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ResultadosTable } from "@/components/tables/resultados-table";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import prisma from "@/lib/db";
import { generarClasificacion, agruparPorRegatista, agruparTripulaciones } from "@/lib/scoring";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.campeonato.findUnique({ where: { id }, select: { nombre: true } });
  return {
    title: c ? `${c.nombre} | FAY Stats` : 'Campeonato | FAY Stats',
  };
}

export default async function CampeonatoDetailPage({ params }: Props) {
  const { id } = await params;

  const campeonato = await prisma.campeonato.findUnique({
    where: { id },
    include: {
      clase: true,
      sede: true,
      regatas: {
        include: {
          resultados: {
            include: {
              regatista: {
                include: { club: true }
              }
            }
          }
        },
        orderBy: { numero: 'asc' }
      }
    }
  });

  if (!campeonato) {
    notFound();
  }

  const regatistasList = agruparPorRegatista(campeonato.regatas);
  const clasificacion = generarClasificacion(regatistasList, campeonato.descartes);

  const regatas = campeonato.regatas.map(r => r.numero);

  // Mapear al formato de la tabla, agrupando tripulaciones de más de una
  // persona (ej: 29er) en una sola fila -"Fulano & Mengano"- en vez de
  // mostrar dos botes idénticos con el mismo puntaje.
  const clasificacionAgrupada = agruparTripulaciones(clasificacion);

  const clasificacionTabla = clasificacionAgrupada.map((c) => ({
    id: c.regatistaId,
    integrantes: c.integrantes,
    posicion: c.posicionFinal,
    nombre: c.nombre,
    club: c.club || 'Sin Club',
    totalNeto: c.totalNeto,
    datosExtra: c.datosExtra,
    puntajes: c.resultados.map((r) => ({
      regata: r.regataNumero,
      puntos: r.puntos,
      descartado: r.descartado,
      observacion: r.observacion || undefined
    }))
  }));

  // Unión de los nombres de columnas personalizadas presentes en cualquier
  // fila -no todos los regatistas tienen las mismas (ej: solo algunos
  // traían "Categoría" en el archivo importado).
  const columnasExtra = Array.from(
    new Set(clasificacionAgrupada.flatMap((c) => Object.keys(c.datosExtra || {})))
  );

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default" className="text-sm px-3 py-1 bg-primary text-primary-foreground">{campeonato.clase.nombre}</Badge>
            <Badge variant="muted" className="text-sm px-3 py-1 bg-surface text-foreground">{campeonato.anio}</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{campeonato.nombre}</h1>
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
              <span>{campeonato.sede?.nombre || 'Sede FAY'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              <span>{campeonato.fechaInicio ? new Date(campeonato.fechaInicio).toLocaleDateString('es-AR') : campeonato.anio}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-1">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Regatistas</span>
            <span className="text-2xl font-semibold">{regatistasList.length}</span>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Regatas Disputadas</span>
            <span className="text-2xl font-semibold">{campeonato.regatas.length}</span>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Descartes Aplicados</span>
            <span className="text-2xl font-semibold">{campeonato.descartes}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Clasificación General</h2>
          <ResultadosTable clasificacion={clasificacionTabla} regatas={regatas} columnasExtra={columnasExtra} />
        </div>
      </div>
    </main>
  );
}
