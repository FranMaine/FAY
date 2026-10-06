import { Metadata } from "next";
import { Globe, Share, Plus, Check, EllipsisVertical, Download, Smartphone, type LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Agregar Orzando a tu celular",
  description: "Paso a paso para tener Orzando en la pantalla de inicio de tu iPhone o Android, como una app.",
};

interface Paso {
  titulo: string;
  detalle: string;
  icono: LucideIcon;
  // Texto del elemento que hay que tocar, tal como aparece en el celular.
  etiquetaEnPantalla: string;
}

const PASOS_IPHONE: Paso[] = [
  {
    titulo: "Abrí Orzando en Safari",
    detalle: "Tiene que ser Safari. Chrome en iPhone no muestra esta opción.",
    icono: Globe,
    etiquetaEnPantalla: "orzando.vercel.app",
  },
  {
    titulo: "Tocá el botón Compartir",
    detalle: "Es el cuadrado con una flecha hacia arriba, en la barra de abajo.",
    icono: Share,
    etiquetaEnPantalla: "Compartir",
  },
  {
    titulo: "Elegí Agregar a inicio",
    detalle: "Bajá en la lista de opciones hasta encontrarla.",
    icono: Plus,
    etiquetaEnPantalla: "Agregar a pantalla de inicio",
  },
  {
    titulo: "Confirmá con Agregar",
    detalle: "Arriba a la derecha. El ícono de Orzando queda en tu pantalla de inicio.",
    icono: Check,
    etiquetaEnPantalla: "Agregar",
  },
];

const PASOS_ANDROID: Paso[] = [
  {
    titulo: "Abrí Orzando en Chrome",
    detalle: "Chrome es el navegador que viene por defecto en la mayoría de los Android.",
    icono: Globe,
    etiquetaEnPantalla: "orzando.vercel.app",
  },
  {
    titulo: "Tocá los tres puntos",
    detalle: "Están arriba a la derecha, en el menú del navegador.",
    icono: EllipsisVertical,
    etiquetaEnPantalla: "Menú",
  },
  {
    titulo: "Elegí Instalar app",
    detalle: "Puede aparecer como Agregar a pantalla principal, según el celular.",
    icono: Download,
    etiquetaEnPantalla: "Instalar app",
  },
  {
    titulo: "Confirmá con Instalar",
    detalle: "Orzando queda en tu cajón de apps y en la pantalla principal.",
    icono: Check,
    etiquetaEnPantalla: "Instalar",
  },
];

function Pasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="space-y-4">
      {pasos.map((paso, indice) => {
        const Icono = paso.icono;
        return (
          <li key={paso.titulo} className="flex gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-solid text-sm font-bold text-white">
              {indice + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{paso.titulo}</h3>
                <p className="text-sm text-muted-foreground">{paso.detalle}</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5">
                <Icono className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate text-sm font-medium text-foreground">{paso.etiquetaEnPantalla}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function AgregarAppPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 space-y-14">
        <header className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Sin tienda, sin descargar nada
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Agregá Orzando a tu celular</h1>
          <p className="text-muted-foreground">
            Queda en tu pantalla de inicio como una app, con su propio ícono. Lleva menos de un minuto.
          </p>
        </header>

        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          <section aria-labelledby="iphone" className="space-y-5">
            <div className="flex items-center gap-3">
              <img src="https://cdn.simpleicons.org/apple/ffffff" alt="" width={32} height={32} className="h-8 w-8 dark:invert-0 invert" />
              <div>
                <h2 id="iphone" className="text-xl font-semibold">iPhone</h2>
                <p className="text-sm text-muted-foreground">Desde Safari</p>
              </div>
            </div>
            <Pasos pasos={PASOS_IPHONE} />
          </section>

          <section aria-labelledby="android" className="space-y-5">
            <div className="flex items-center gap-3">
              <img src="https://cdn.simpleicons.org/android/3DDC84" alt="" width={32} height={32} className="h-8 w-8" />
              <div>
                <h2 id="android" className="text-xl font-semibold">Android</h2>
                <p className="text-sm text-muted-foreground">Desde Chrome</p>
              </div>
            </div>
            <Pasos pasos={PASOS_ANDROID} />
          </section>
        </div>

        <p className="max-w-2xl text-sm text-muted-foreground">
          Si tu celular no muestra estas opciones, probá con otro navegador o actualizá el que tenés. Los datos de Orzando
          siguen siendo los mismos, solo cambia cómo llegás a la página.
        </p>
      </div>
    </main>
  );
}
