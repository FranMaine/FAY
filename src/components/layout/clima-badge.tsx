'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Wind, type LucideIcon } from 'lucide-react';
import { categoriaClima, ETIQUETA_CLIMA, direccionViento, type CategoriaClima } from '@/lib/clima';
import { LUGAR_PREDETERMINADO, urlViento } from '@/lib/lugares';

interface DatosClima {
  lugar: { slug: string; nombre: string };
  temperatura: number;
  codigoClima: number;
  vientoNudos: number;
  vientoGrados: number;
  vientoMedido: boolean;
}

const ICONO_CLIMA: Record<CategoriaClima, LucideIcon> = {
  despejado: Sun,
  nublado: Cloud,
  niebla: CloudFog,
  llovizna: CloudDrizzle,
  lluvia: CloudRain,
  nieve: CloudSnow,
  tormenta: CloudLightning,
};

const REFRESCO_MS = 10 * 60 * 1000;

// Clima actual al lado del logo de la navbar: de San Isidro, o -si la
// persona entró con una cuenta vinculada a un regatista- del lugar de su
// club. Arranca siempre en el predeterminado (sin esperar a la sesión, así
// nadie ve el badge más tarde) y, si hay sesión, cambia al lugar del club en
// cuanto /api/mi-lugar responde. Si la API no responde, no muestra nada (no
// rompe la barra).
export function ClimaBadge() {
  const { status } = useSession();
  const [slug, setSlug] = useState(LUGAR_PREDETERMINADO.slug);
  const [datos, setDatos] = useState<DatosClima | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelado = false;
    fetch('/api/mi-lugar')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { slug?: string } | null) => {
        if (!cancelado && json?.slug) setSlug(json.slug);
      })
      .catch(() => {
        // Sin red: queda en el lugar predeterminado.
      });
    return () => {
      cancelado = true;
    };
  }, [status]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await fetch(slug === LUGAR_PREDETERMINADO.slug ? '/api/clima' : `/api/clima/${slug}`);
        if (!res.ok) return;
        const json = (await res.json()) as DatosClima;
        if (!cancelado) setDatos(json);
      } catch {
        // Sin red: simplemente no se muestra el clima.
      }
    }
    cargar();
    const intervalo = setInterval(cargar, REFRESCO_MS);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [slug]);

  if (!datos) return null;

  const categoria = categoriaClima(datos.codigoClima);
  const Icono = ICONO_CLIMA[categoria];
  const fuenteViento = datos.vientoMedido ? 'medido en la estación más cercana' : 'estimado';
  const cielo = `${datos.lugar.nombre}: ${datos.temperatura}°C, ${ETIQUETA_CLIMA[categoria]}`;
  const viento = `viento ${datos.vientoNudos} nudos del ${direccionViento(datos.vientoGrados)} (${fuenteViento})`;

  return (
    <div className="flex items-center gap-2 text-xs text-foreground tabular-nums">
      {/* role="img": un aria-label suelto sobre un <span> genérico lo
          ignoran los lectores de pantalla -con el rol, leen la descripción
          completa. Solo envuelve cielo+temperatura: el viento es un link
          (un link adentro de role="img" quedaría fuera del árbol de
          accesibilidad). */}
      <span role="img" title={cielo} aria-label={cielo} className="flex items-center gap-2">
        <Icono className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="font-medium">{datos.temperatura}°</span>
      </span>
      {/* El viento lleva a la página de viento del lugar (detalle, últimas 24 h, pronóstico y
          mapa) dentro de Orzando. py/-my agrandan la zona táctil sin
          cambiar el alto del navbar; el subrayado punteado avisa que es
          tocable (en el celular no hay hover). */}
      <Link
        href={urlViento(datos.lugar.slug)}
        title={`${viento}. Ver el detalle del viento en ${datos.lugar.nombre}`}
        aria-label={`${viento}. Ver el detalle del viento en ${datos.lugar.nombre}`}
        className="-my-2 flex items-center gap-1 rounded-sm py-2 underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Wind className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        {datos.vientoNudos} kn {direccionViento(datos.vientoGrados)}
      </Link>
    </div>
  );
}
