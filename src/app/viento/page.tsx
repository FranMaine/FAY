import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowUpIcon, WindIcon, MapPinIcon } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { GraficoViento, horaLocal } from '@/components/viento/grafico-viento';
import { direccionViento, intensidadViento, SAN_ISIDRO, ESTACION_METAR } from '@/lib/clima';
import { obtenerHistorialMedido, obtenerPronostico, estaDesactualizada } from '@/lib/viento';

export const metadata: Metadata = {
  title: 'Viento en San Isidro',
  description: 'Viento en tiempo real en San Isidro, en nudos: la medición de la estación de San Fernando, las últimas 24 horas, el pronóstico de las próximas 24 y un mapa de viento.',
};

// Los datos se piden con revalidate de 10 min (ver lib/viento.ts), igual que
// el badge del navbar -esta página se regenera a ese ritmo.
export const revalidate = 600;

// Mapa de viento de Windy (su embed oficial, gratis y sin clave), centrado
// en San Isidro y en nudos. Va en un <iframe>: el CSP lo permite en
// frame-src (ver next.config.ts).
function urlMapaWindy() {
  const { latitud, longitud } = SAN_ISIDRO;
  const params = new URLSearchParams({
    lat: String(latitud),
    lon: String(longitud),
    detailLat: String(latitud),
    detailLon: String(longitud),
    zoom: '9',
    level: 'surface',
    overlay: 'wind',
    product: 'ecmwf',
    marker: 'true',
    message: 'true',
    calendar: 'now',
    type: 'map',
    location: 'coordinates',
    metricWind: 'kt',
    metricTemp: '°C',
  });
  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

// La flecha apunta hacia donde VA el viento (convención de los mapas de
// viento), no de dónde viene: por eso se suman 180° a los grados "de
// dónde sopla" que informan las estaciones.
function Brujula({ grados }: { grados: number | null }) {
  const etiqueta = grados === null ? 'Dirección variable' : `Viento del ${direccionViento(grados)} (${Math.round(grados)}°)`;
  const puntos = [
    { letra: 'N', clase: 'left-1/2 top-1.5 -translate-x-1/2' },
    { letra: 'E', clase: 'right-2 top-1/2 -translate-y-1/2' },
    { letra: 'S', clase: 'bottom-1.5 left-1/2 -translate-x-1/2' },
    { letra: 'O', clase: 'left-2 top-1/2 -translate-y-1/2' },
  ];
  return (
    <div role="img" aria-label={etiqueta} className="relative h-28 w-28 shrink-0 rounded-full border border-border bg-background/60">
      {puntos.map((p) => (
        <span key={p.letra} aria-hidden="true" className={`absolute text-[10px] font-semibold text-muted-foreground ${p.clase}`}>
          {p.letra}
        </span>
      ))}
      {grados !== null && (
        <ArrowUpIcon aria-hidden="true" className="absolute inset-0 m-auto h-12 w-12 text-primary" style={{ transform: `rotate(${grados + 180}deg)` }} />
      )}
    </div>
  );
}

export default async function VientoPage() {
  const [historial, pronostico] = await Promise.all([obtenerHistorialMedido(), obtenerPronostico()]);

  const actual = historial.at(-1) ?? null;
  const desactualizado = estaDesactualizada(actual);
  // Misma escala en los dos gráficos, así una barra "alta" significa lo mismo en ambos.
  const maximo = Math.max(
    25,
    ...[...historial, ...pronostico].flatMap((l) => [l.nudos, l.rafaga ?? 0])
  );
  const tope = Math.ceil(maximo / 5) * 5;

  return (
    <main className="min-h-dvh bg-background p-6 text-foreground md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link href="/" className="-mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Volver al inicio
        </Link>

        <header className="fade-in-up relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-surface to-surface p-6 md:p-10">
          <WindIcon aria-hidden="true" className="absolute -right-6 -top-6 h-48 w-48 text-foreground opacity-[0.05]" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <MapPinIcon className="h-4 w-4" aria-hidden="true" /> San Isidro, Río de la Plata
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Viento ahora</h1>

              {actual ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span className="text-7xl font-extrabold leading-none tabular-nums md:text-8xl">{Math.round(actual.nudos)}</span>
                    <span className="text-2xl font-semibold text-muted-foreground">kn</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-sm font-medium">
                      <span className={`h-2.5 w-2.5 rounded-full ${intensidadViento(actual.nudos).fondo}`} aria-hidden="true" />
                      {intensidadViento(actual.nudos).etiqueta}
                    </span>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="text-lg text-foreground">
                      {actual.grados === null ? 'Dirección variable' : `Del ${direccionViento(actual.grados)} (${Math.round(actual.grados)}°)`}
                      {actual.rafaga !== null && actual.rafaga > actual.nudos && <span className="text-muted-foreground"> · ráfagas de {Math.round(actual.rafaga)} kn</span>}
                    </p>
                    <p className="text-sm">
                      Medido en la estación de San Fernando ({ESTACION_METAR}) a las {horaLocal(actual.hora)}.
                      {desactualizado && <span className="text-accent"> La estación no reporta hace varias horas.</span>}
                    </p>
                  </div>
                </>
              ) : (
                <p className="max-w-md text-muted-foreground">
                  Ahora no pudimos obtener la medición de la estación. Mirá el pronóstico y el mapa de abajo.
                </p>
              )}
            </div>
            {actual && <Brujula grados={actual.grados} />}
          </div>
        </header>

        <ScrollReveal>
          <GraficoViento
            titulo="Últimas 24 horas"
            subtitulo="Lo que midió la estación. Cada barra es una lectura; la franja clara detrás es la ráfaga."
            lecturas={historial}
            maximo={tope}
            vacio="No hay lecturas de la estación en las últimas 24 horas."
          />
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <GraficoViento
            titulo="Próximas 24 horas"
            subtitulo="Pronóstico del modelo, hora por hora. Es una estimación: puede diferir de lo que se mida."
            lecturas={pronostico}
            maximo={tope}
            vacio="No pudimos obtener el pronóstico por ahora."
          />
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
            <h2 className="text-lg font-bold">Mapa de viento</h2>
            <p className="mb-4 text-sm text-muted-foreground">Las flechas muestran hacia dónde va el viento; el color, su fuerza.</p>
            <iframe
              title="Mapa de viento de Windy centrado en San Isidro"
              src={urlMapaWindy()}
              loading="lazy"
              className="h-[420px] w-full rounded-xl border border-border"
            />
          </section>
        </ScrollReveal>

        <p className="pb-4 text-xs leading-relaxed text-muted-foreground">
          La medición viene del aeródromo de San Fernando, a unos 12 km de San Isidro y sobre la misma costa: sirve de referencia, pero el
          viento en el agua frente a tu club puede ser distinto. Fuentes:{' '}
          <a className="underline hover:text-foreground" href={`https://aviationweather.gov/data/metar/?ids=${ESTACION_METAR}`} target="_blank" rel="noopener noreferrer">
            AviationWeather.gov
          </a>{' '}
          (medición),{' '}
          <a className="underline hover:text-foreground" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
            Open-Meteo
          </a>{' '}
          (pronóstico) y{' '}
          <a className="underline hover:text-foreground" href="https://www.windy.com/" target="_blank" rel="noopener noreferrer">
            Windy
          </a>{' '}
          (mapa).
        </p>
      </div>
    </main>
  );
}
