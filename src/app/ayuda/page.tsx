import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CloudSun,
  Medal,
  Search,
  Smartphone,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Ayuda y tutorial",
  description:
    "Tutorial y ayuda de Orzando, paso a paso: buscar regatistas, ver campeonatos y rankings, consultar el viento y armar tu perfil.",
};

interface Seccion {
  id: string;
  titulo: string;
  icono: LucideIcon;
  intro: string;
  pasos: string[];
  enlace?: { href: string; texto: string };
}

// Cada sección explica UNA cosa que se puede hacer, con pasos cortos y un
// link para probarla ahí mismo. Si cambia una pantalla, se actualiza acá.
const SECCIONES: Seccion[] = [
  {
    id: "buscar",
    titulo: "Buscar a un regatista",
    icono: Search,
    intro: "Es lo más rápido para ver cómo le fue a alguien, o cómo te fue a vos.",
    pasos: [
      "En el inicio, escribí un nombre o apellido en el buscador. No hace falta apretar nada: los resultados aparecen mientras tipeás.",
      "Tocá a la persona en la lista para abrir su perfil.",
      "En el perfil ves su club, todos sus campeonatos, la posición en cada uno y sus logros.",
    ],
    enlace: { href: "/", texto: "Ir al buscador" },
  },
  {
    id: "campeonatos",
    titulo: "Ver campeonatos y resultados",
    icono: Trophy,
    intro: "Todos los campeonatos cargados, con su tabla de posiciones completa.",
    pasos: [
      "Entrá a Campeonatos y elegí uno. Los hay agrupados por evento y por clase.",
      "Vas a ver la tabla: posición, regatista, puesto en cada regata, descartes y total.",
      "Para encontrar a alguien rápido, escribí su nombre en el buscador que está arriba de la tabla: te muestra en qué posición terminó.",
      "Si querés los datos en una planilla, usá el botón para descargar el Excel.",
    ],
    enlace: { href: "/campeonatos", texto: "Ver campeonatos" },
  },
  {
    id: "rankings",
    titulo: "Consultar los rankings",
    icono: BarChart3,
    intro: "El ranking anual de cada clase, con lo acumulado en todos sus campeonatos.",
    pasos: [
      "En Rankings, elegí la clase.",
      "Elegí la temporada. La opción de todos los años suma toda la historia.",
      "Tocá a un regatista para ir a su perfil.",
      "Si querés entender cómo se calculan los puntos y los descartes, mirá la explicación de los puntajes.",
    ],
    enlace: { href: "/rankings", texto: "Ver rankings" },
  },
  {
    id: "clubes",
    titulo: "Explorar los clubes",
    icono: Building2,
    intro: "Cada club tiene su página con sus resultados y su historial.",
    pasos: [
      "Entrá a Clubes y recorré la lista hasta encontrar el tuyo.",
      "Dentro del club ves sus campeonatos por categoría y un ranking interno de sus regatistas, ordenado por victorias y podios.",
    ],
    enlace: { href: "/clubes", texto: "Ver clubes" },
  },
  {
    id: "clima",
    titulo: "Mirar el viento y el clima",
    icono: CloudSun,
    intro: "Para saber cómo está el agua antes de salir a navegar.",
    pasos: [
      "Arriba, al lado del nombre, ves la temperatura y el viento (nudos y dirección) del lugar.",
      "Tocá el viento, o entrá a Clima en el menú, para ver el detalle: lo medido en las últimas 24 horas, el pronóstico y un mapa.",
      "Si entrás con tu cuenta y tu perfil está vinculado a un club, el viento arranca en la ciudad de tu club. Con el selector podés cambiar de lugar.",
      "Donde dice Estimado, el dato viene de un modelo de pronóstico porque no hay una estación de medición cerca.",
    ],
    enlace: { href: "/viento", texto: "Ver el viento" },
  },
  {
    id: "cuenta",
    titulo: "Crear tu cuenta y vincular tu perfil",
    icono: UserRound,
    intro: "Con una cuenta tu ficha de regatista queda asociada a vos.",
    pasos: [
      "Tocá Registro, completá tus datos y aceptá los términos.",
      "Te llega un mail para verificar tu cuenta: abrí el link que trae. Si no lo ves, revisá la carpeta de correo no deseado.",
      "Ingresá y buscá tu nombre para pedir la vinculación con tu ficha. Te pedimos algún dato que solo vos sepas (número de vela, club o último campeonato) y un administrador lo revisa antes de aprobarla.",
      "Cuando esté aprobada, te llega un mail. En Mi perfil ves tus resultados y tus logros, y podés elegir un apodo; además te avisamos por mail cada vez que se publica un campeonato en el que figurás.",
    ],
    enlace: { href: "/registro", texto: "Crear mi cuenta" },
  },
  {
    id: "logros",
    titulo: "Conseguir logros",
    icono: Medal,
    intro: "Medallas que se desbloquean solas según tu historial.",
    pasos: [
      "En tu perfil hay 21 medallas: Debut, Primer podio, Racha de podios, Veterano y más.",
      "Las que ya tenés se ven en color; las que faltan, en gris.",
      "Tocá cualquier medalla para ver qué hay que hacer para conseguirla, o en qué campeonato la ganaste.",
    ],
  },
  {
    id: "celular",
    titulo: "Tener Orzando en tu celular",
    icono: Smartphone,
    intro: "Se instala como una app, sin tienda ni descargas.",
    pasos: [
      "Abrí Orzando en Safari (iPhone) o en Chrome (Android).",
      "Agregalo a la pantalla de inicio desde el menú del navegador.",
      "Cuando salga una versión nueva, la app te avisa con un cartel para actualizar con un toque.",
    ],
    enlace: { href: "/agregar-app", texto: "Ver el paso a paso" },
  },
];

export default function AyudaPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 space-y-12">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Ayuda y tutorial</h1>
          <p className="max-w-2xl text-muted-foreground">
            Orzando reúne los resultados, rankings y perfiles de la vela argentina: cada regata, cada regatista. Acá
            tenés lo que se puede hacer y cómo hacerlo, en pocos pasos.
          </p>
          <nav aria-label="Secciones de la ayuda" className="flex flex-wrap gap-2 pt-1">
            {SECCIONES.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {s.titulo}
              </a>
            ))}
          </nav>
        </header>

        <div className="space-y-6">
          {SECCIONES.map((s) => {
            const Icono = s.icono;
            return (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-titulo`}
                className="scroll-mt-24 space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icono className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <h2 id={`${s.id}-titulo`} className="text-xl font-semibold">
                      {s.titulo}
                    </h2>
                    <p className="text-sm text-muted-foreground">{s.intro}</p>
                  </div>
                </div>

                <ol className="space-y-3">
                  {s.pasos.map((paso, i) => (
                    <li key={paso} className="flex gap-3 text-foreground/90">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-solid text-xs font-bold text-white tabular-nums">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{paso}</span>
                    </li>
                  ))}
                </ol>

                {s.enlace && (
                  <Link
                    href={s.enlace.href}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {s.enlace.texto}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </section>
            );
          })}
        </div>

        <footer className="space-y-2 rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground sm:p-6">
          <p>
            Orzando está en sus primeras etapas. Si ves un error, tu nombre está duplicado o querés que agreguemos un
            campeonato, escribinos desde la{" "}
            <Link href="/contacto" className="font-medium text-primary hover:underline">
              página de contacto
            </Link>
            .
          </p>
          <p>
            ¿Querés saber cómo se calculan las posiciones?{" "}
            <Link href="/reglas" className="font-medium text-primary hover:underline">
              Cómo se calculan los puntajes
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
