import { ViewTransition } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Podio } from "@/components/ranking/podio";
import { ClaseIcon } from "@/components/icons/clase-icons";
import { ResultadosTable } from "@/components/tables/resultados-table";
import { CsvDownloadButton } from "@/components/ui/csv-download-button";
import { ArrowLeftIcon, CalendarIcon, FlagIcon, MapPinIcon, ScissorsIcon, UsersIcon } from "lucide-react";
import prisma from "@/lib/db";
import { generarClasificacion, agruparPorRegatista, agruparTripulaciones } from "@/lib/scoring";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site";
import { jsonLdSeguro } from "@/lib/json-ld";

// Sin esto, esta página quedaba 100% estática después de la primera
// visita -Next.js la cachea indefinidamente porque no usa ninguna API
// dinámica (solo el "id" de la ruta, conocido). Si un admin corrige un
// resultado o publica una regata nueva, quien ya la había cacheado seguía
// viendo la versión vieja hasta el próximo deploy (mismo bug que tenía la
// home). ISR con 60s de revalidación -igual que /rankings- da lo mejor de
// los dos mundos: la mayoría de las visitas sigue sirviendo desde caché
// (rápido, sin pegarle a la base en cada request), pero nunca queda
// desactualizada por más de un minuto.
export const revalidate = 60;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // Sin el "| Regateando" acá: el layout raíz ya le agrega ese sufijo a
  // cualquier título que devuelva una página hija (title.template) -antes
  // esto lo agregaba manual ACÁ TAMBIÉN, así que el <title> real terminaba
  // duplicado ("Vela Fest 2025 | Regateando | Regateando").
  const c = await prisma.campeonato.findUnique({
    where: { id },
    select: { nombre: true, anio: true, clase: { select: { nombre: true } }, sede: { select: { nombre: true } } },
  });
  if (!c) return { title: 'Campeonato no encontrado' };

  return {
    title: `${c.nombre} ${c.anio}`,
    description: `Resultados y tabla de posiciones de ${c.nombre} ${c.anio} (${c.clase.nombre})${c.sede ? `, en ${c.sede.nombre}` : ''}. Clasificación completa.`,
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

  // Datos estructurados (schema.org SportsEvent): ayuda a que un buscador
  // entienda que esto es un evento deportivo puntual, con su deporte,
  // organizador y lugar -no solo texto suelto. startDate es requerido por
  // el schema; si no tenemos fecha cargada, usamos el 1/1 del año del
  // campeonato como aproximación (mejor eso que omitir el campo entero).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${campeonato.nombre} ${campeonato.anio}`,
    sport: "Sailing",
    startDate: (campeonato.fechaInicio ?? new Date(campeonato.anio, 0, 1)).toISOString(),
    ...(campeonato.fechaFin ? { endDate: campeonato.fechaFin.toISOString() } : {}),
    location: campeonato.sede
      ? { "@type": "Place", name: campeonato.sede.nombre }
      : undefined,
    url: `${SITE_URL}/campeonatos/${campeonato.id}`,
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto space-y-8">
        <Link href="/campeonatos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors -mb-2">
          <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" /> Volver a campeonatos
        </Link>

        <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-surface to-surface p-6 md:p-10">
          <ClaseIcon nombreClase={campeonato.clase.nombre} className="absolute -right-6 -top-6 h-48 w-48 object-contain opacity-[0.07]" />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
                <ClaseIcon nombreClase={campeonato.clase.nombre} className="h-5 w-5 object-contain brightness-0 invert" />
                {campeonato.clase.nombre}
              </span>
              <span className="rounded-lg border border-border bg-background/40 px-3 py-1.5 text-sm font-semibold tabular-nums">{campeonato.anio}</span>
            </div>
            <ViewTransition name={`campeonato-${campeonato.id}`} share="morph" default="none">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{campeonato.nombre}</h1>
            </ViewTransition>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
              {campeonato.sede && (
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" aria-hidden="true" />
                  <span>{campeonato.sede.nombre}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" aria-hidden="true" />
                <span className="tabular-nums">{campeonato.fechaInicio ? new Date(campeonato.fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : campeonato.anio}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icono: UsersIcon, etiqueta: "Regatistas", valor: regatistasList.length },
            { icono: FlagIcon, etiqueta: "Regatas disputadas", valor: campeonato.regatas.length },
            { icono: ScissorsIcon, etiqueta: "Descartes aplicados", valor: campeonato.descartes },
          ].map(({ icono: Icono, etiqueta, valor }) => (
            <div key={etiqueta} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icono className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-bold leading-none tabular-nums">{valor}</p>
                <p className="mt-1 text-sm text-muted-foreground">{etiqueta}</p>
              </div>
            </div>
          ))}
        </div>

        <Podio
          unidad="pts netos"
          items={[...clasificacionTabla]
            .sort((x, y) => x.posicion - y.posicion)
            .slice(0, 3)
            .map((c) => ({
              id: c.id,
              href: `/regatistas/${c.integrantes?.[0]?.regatistaId ?? c.id}`,
              titulo: c.nombre,
              subtitulo: c.club,
              puntos: c.totalNeto,
            }))}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold">Clasificación General</h2>
              <Link href="/reglas" className="text-xs text-muted-foreground hover:text-primary hover:underline">¿Cómo se calcula esto?</Link>
            </div>
            <CsvDownloadButton
              filename={`${campeonato.nombre} ${campeonato.anio}.csv`}
              headers={["Posición", "Regatista", "Club", ...regatas.map((r) => `R${r}`), "Total Neto", ...columnasExtra]}
              rows={clasificacionTabla.map((c) => {
                const puntajesPorRegata = new Map(c.puntajes.map((p) => [p.regata, p]));
                return [
                  c.posicion,
                  c.integrantes && c.integrantes.length > 1 ? c.integrantes.map((i) => i.nombre).join(" / ") : c.nombre,
                  c.club,
                  ...regatas.map((r) => {
                    const p = puntajesPorRegata.get(r);
                    if (!p) return "";
                    return p.descartado ? `(${p.puntos})` : p.puntos;
                  }),
                  c.totalNeto,
                  ...columnasExtra.map((col) => c.datosExtra?.[col] ?? ""),
                ];
              })}
            />
          </div>
          <ResultadosTable clasificacion={clasificacionTabla} regatas={regatas} columnasExtra={columnasExtra} />
        </div>
      </div>
    </main>
  );
}
