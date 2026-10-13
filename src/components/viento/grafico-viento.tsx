import { direccionViento, intensidadViento } from '@/lib/clima';
import type { LecturaViento } from '@/lib/viento';

const ZONA = 'America/Argentina/Buenos_Aires';

export function horaLocal(fecha: Date): string {
  return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
}

interface GraficoVientoProps {
  titulo: string;
  subtitulo: string;
  lecturas: LecturaViento[];
  /** Tope del eje en nudos. Se pasa desde afuera para que dos gráficos juntos usen la MISMA escala. */
  maximo: number;
  /** Texto si no hay datos (la API de la fuente puede no responder). */
  vacio: string;
}

// Barras: una por lectura, altura = nudos, color = intensidad (la misma
// escala que el número grande de /viento). La franja clara detrás de cada
// barra es la ráfaga. Sin librería de gráficos: son <div> con altura en %,
// así es liviano y se renderiza en el servidor (cero JS en el navegador).
export function GraficoViento({ titulo, subtitulo, lecturas, maximo, vacio }: GraficoVientoProps) {
  const marcas = [10, 20, 30].filter((m) => m < maximo);
  const nudos = lecturas.map((l) => l.nudos);
  const resumen = lecturas.length
    ? `${titulo}: entre ${Math.min(...nudos)} y ${Math.max(...nudos)} nudos, ${lecturas.length} lecturas.`
    : titulo;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </div>

      {lecturas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <>
          <div role="img" aria-label={resumen} className="relative h-40">
            {marcas.map((m) => (
              <div
                key={m}
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border"
                style={{ bottom: `${(m / maximo) * 100}%` }}
              >
                <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] tabular-nums text-muted-foreground">{m} kn</span>
              </div>
            ))}
            <div className="relative flex h-full items-end gap-[3px]">
              {lecturas.map((l) => {
                const { fondo, etiqueta } = intensidadViento(l.nudos);
                const dir = l.grados === null ? 'dirección variable' : `del ${direccionViento(l.grados)}`;
                const detalle = `${horaLocal(l.hora)} · ${Math.round(l.nudos)} kn${l.rafaga ? ` (ráfaga ${Math.round(l.rafaga)})` : ''} ${dir} · ${etiqueta}`;
                return (
                  <div key={l.hora.getTime()} title={detalle} className="relative flex h-full min-w-[3px] flex-1 items-end">
                    {l.rafaga !== null && l.rafaga > l.nudos && (
                      <div className="absolute inset-x-0 bottom-0 rounded-t-sm bg-foreground/15" style={{ height: `${Math.min(100, (l.rafaga / maximo) * 100)}%` }} />
                    )}
                    <div className={`relative w-full rounded-t-sm ${fondo}`} style={{ height: `${Math.max(3, Math.min(100, (l.nudos / maximo) * 100))}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground" aria-hidden="true">
            <span>{horaLocal(lecturas[0].hora)}</span>
            <span>{horaLocal(lecturas[Math.floor(lecturas.length / 2)].hora)}</span>
            <span>{horaLocal(lecturas[lecturas.length - 1].hora)}</span>
          </div>
        </>
      )}
    </section>
  );
}
