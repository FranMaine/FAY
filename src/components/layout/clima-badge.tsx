'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Wind, type LucideIcon } from 'lucide-react';
import { categoriaClima, ETIQUETA_CLIMA, direccionViento, enlaceViento, type CategoriaClima } from '@/lib/clima';

interface DatosClima {
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

// Clima actual de San Isidro al lado del logo de la navbar. Si la API no
// responde, no muestra nada (no rompe la barra).
export function ClimaBadge() {
  const [datos, setDatos] = useState<DatosClima | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await fetch('/api/clima');
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
  }, []);

  if (!datos) return null;

  const categoria = categoriaClima(datos.codigoClima);
  const Icono = ICONO_CLIMA[categoria];
  const fuenteViento = datos.vientoMedido ? 'medido en San Fernando' : 'estimado';
  const cielo = `San Isidro: ${datos.temperatura}°C, ${ETIQUETA_CLIMA[categoria]}`;
  const viento = `viento ${datos.vientoNudos} nudos del ${direccionViento(datos.vientoGrados)} (${fuenteViento})`;
  const enlace = enlaceViento(datos.vientoMedido);

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
      {/* El viento lleva a la fuente del dato para ver más (ver
          enlaceViento). py/-my agrandan la zona táctil sin cambiar el alto
          del navbar; el subrayado punteado avisa que es tocable (en el
          celular no hay hover). */}
      <a
        href={enlace.href}
        target="_blank"
        rel="noopener noreferrer"
        title={`${viento}. Ver más datos en ${enlace.destino}`}
        aria-label={`${viento}. Abre ${enlace.destino} en una pestaña nueva`}
        className="-my-2 flex items-center gap-1 rounded-sm py-2 underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Wind className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        {datos.vientoNudos} kn {direccionViento(datos.vientoGrados)}
      </a>
    </div>
  );
}
