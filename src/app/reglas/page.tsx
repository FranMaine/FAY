import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cómo se calculan los puntajes",
  description: "Explicación del sistema de puntaje, descartes y flotas que usa Regateando para armar la tabla de posiciones de cada campeonato.",
};

export default function ReglasPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Cómo se calculan los puntajes</h1>
          <p className="text-muted-foreground">
            La tabla de posiciones de cada campeonato no es simplemente la suma de puntos de cada regata -acá está explicado qué hace el sistema paso a paso.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-foreground/90 leading-relaxed">
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary tabular-nums">1</span>Sistema de puntaje bajo (low-point)</h2>
          <p>
            Cada regatista suma tantos puntos como el puesto en el que terminó cada regata: el 1º puesto suma 1 punto,
            el 2º suma 2, y así -al revés de un sistema donde ganar suma más. Por eso <strong>gana quien tiene MENOS
            puntos</strong>, no más.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-foreground/90 leading-relaxed">
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary tabular-nums">2</span>Descartes</h2>
          <p>
            La mayoría de los campeonatos permite descartar las peores regatas de cada regatista antes de sumar el
            total -cuántas regatas se descartan depende de la convocatoria de cada evento (se muestra como
            &quot;Descartes Aplicados&quot; en la ficha de cada campeonato). El <strong>Total Neto</strong> que se
            usa para ordenar la tabla es la suma de puntos SIN contar esas regatas descartadas; el sistema elige
            automáticamente cuáles son las peores de cada regatista para descartar, no tiene que pedirlo nadie regata
            por regata.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-foreground/90 leading-relaxed">
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary tabular-nums">3</span>Desempates</h2>
          <p>
            Cuando dos regatistas terminan con el mismo Total Neto, se desempata por la regla del Apéndice A del
            Reglamento de Regatas a Vela (RRS): gana quien tenga más primeros puestos entre sus regatas no
            descartadas; si siguen empatados, se compara la cantidad de segundos puestos, y así sucesivamente.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-foreground/90 leading-relaxed">
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary tabular-nums">4</span>Flotas (Gold / Silver / Bronze)</h2>
          <p>
            Algunos campeonatos con muchos inscriptos dividen a la flota en niveles (ej: Gold y Silver) para regatear
            en grupos más parejos. En la tabla combinada, <strong>toda la flota Gold queda antes que toda la flota
            Silver</strong>, sin importar que los puntajes se solapen entre una flota y otra -no se mezclan los
            puntajes de niveles distintos como si fuera una sola flota.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-foreground/90 leading-relaxed">
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary tabular-nums">5</span>Cuando el resultado oficial ya viene calculado</h2>
          <p>
            Cuando la fuente de un campeonato (por ejemplo, un archivo exportado de Sailwave) ya trae el puesto y el
            puntaje final de cada regatista calculados, Regateando muestra esos valores tal cual en vez de
            recalcularlos desde cero -así la tabla coincide exactamente con el resultado que publicó el club
            organizador, sin discrepancias por una diferencia de criterio en el desempate o el orden de las flotas.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-6 text-foreground/90 leading-relaxed">
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary tabular-nums">6</span>Puntaje (rankings)</h2>
          <p>
            El <a href="/rankings" className="text-primary hover:underline font-medium">Ranking Nacional</a> usa una
            fórmula propia para poder sumar el desempeño de un regatista a través de varios campeonatos distintos:
            por cada campeonato en el que participó, suma <code className="text-xs bg-surface-hover px-1.5 py-0.5 rounded">(cantidad de inscriptos − posición final) + 1</code> puntos
            -así quedar 1º en un campeonato con más inscriptos vale más que quedar 1º en uno con pocos.
          </p>
        </section>
      </div>
    </main>
  );
}
