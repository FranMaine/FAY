import { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Compass, Globe, Share, SquarePlus, EllipsisVertical, Download, Smartphone, type LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Agregar Orzando a tu celular",
  description: "Paso a paso para tener Orzando en la pantalla de inicio de tu iPhone o Android, como una app.",
};

interface Paso {
  titulo: string;
  detalle: string;
  // Ícono tal como se ve en el celular (el de Safari, el de Compartir, etc.).
  // Sin ícono, la etiqueta se muestra como texto azul de botón de iOS.
  icono?: LucideIcon;
  // En los menús de iOS el ícono va a la derecha del texto.
  iconoAlFinal?: boolean;
  // Muestra el ícono de la app de Orzando (el que queda en la pantalla de inicio).
  iconoDeLaApp?: boolean;
  // Texto del elemento que hay que tocar, tal como aparece en el celular.
  etiquetaEnPantalla: string;
}

const PASOS_IPHONE: Paso[] = [
  {
    titulo: "Abrí el link en Safari",
    detalle: "Tiene que ser Safari. Si lo tocás desde WhatsApp u otra app, elegí \"Abrir en Safari\".",
    icono: Compass,
    etiquetaEnPantalla: "orzando.com.ar",
  },
  {
    titulo: "Tocá Compartir",
    detalle: "Es el cuadradito con la flecha hacia arriba, abajo en el centro. Si no lo ves, tocá los tres puntos ··· de la barra de abajo.",
    icono: Share,
    etiquetaEnPantalla: "Compartir",
  },
  {
    titulo: "Elegí \"Agregar a Inicio\"",
    detalle: "Deslizá la lista hacia arriba hasta encontrarla, tiene un cuadradito con un +.",
    icono: SquarePlus,
    iconoAlFinal: true,
    etiquetaEnPantalla: "Agregar a Inicio",
  },
  {
    titulo: "Tocá \"Agregar\"",
    detalle: "Arriba a la derecha. Vas a ver el nombre \"Orzando\" y su ícono.",
    iconoDeLaApp: true,
    etiquetaEnPantalla: "Agregar",
  },
  {
    titulo: "Abrila desde el ícono",
    detalle: "Listo: Orzando queda en tu pantalla de inicio.",
    iconoDeLaApp: true,
    etiquetaEnPantalla: "Orzando",
  },
];

const PASOS_ANDROID: Paso[] = [
  {
    titulo: "Abrí el link en Chrome",
    detalle: "Si lo abrís desde WhatsApp, tocá los tres puntos y elegí \"Abrir en Chrome\".",
    icono: Globe,
    etiquetaEnPantalla: "orzando.com.ar",
  },
  {
    titulo: "Tocá el menú",
    detalle: "Son los tres puntos de arriba a la derecha.",
    icono: EllipsisVertical,
    etiquetaEnPantalla: "Menú",
  },
  {
    titulo: "Elegí \"Instalar\"",
    detalle: "En algunos celulares dice \"Instalar y crear acceso directo...\": es lo mismo.",
    icono: Download,
    etiquetaEnPantalla: "Instalar",
  },
  {
    titulo: "Confirmá con \"Instalar\"",
    detalle: "Aparece un cartel \"Instalar aplicación\": tocá Instalar abajo a la derecha.",
    iconoDeLaApp: true,
    etiquetaEnPantalla: "Instalar",
  },
  {
    titulo: "Abrila desde el ícono",
    detalle: "La vas a encontrar en la pantalla de inicio o en el cajón de aplicaciones.",
    iconoDeLaApp: true,
    etiquetaEnPantalla: "Orzando",
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
                {paso.iconoDeLaApp && <img src="/apple-icon.png" alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-md" />}
                {Icono && !paso.iconoAlFinal && <Icono className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                <span className={cn("truncate text-sm font-medium", Icono || paso.iconoDeLaApp ? "text-foreground" : "text-primary")}>{paso.etiquetaEnPantalla}</span>
                {Icono && paso.iconoAlFinal && <Icono className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
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
              <img src="/brands/apple.svg" alt="" width={32} height={32} className="h-8 w-8 dark:invert-0 invert" />
              <div>
                <h2 id="iphone" className="text-xl font-semibold">iPhone</h2>
                <p className="text-sm text-muted-foreground">Desde Safari</p>
              </div>
            </div>
            <Pasos pasos={PASOS_IPHONE} />
          </section>

          <section aria-labelledby="android" className="space-y-5">
            <div className="flex items-center gap-3">
              <img src="/brands/android.svg" alt="" width={32} height={32} className="h-8 w-8" />
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
