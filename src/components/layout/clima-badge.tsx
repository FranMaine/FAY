'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Wind, type LucideIcon } from 'lucide-react';
import { categoriaClima, ETIQUETA_CLIMA, direccionViento, type CategoriaClima } from '@/lib/clima';

interface DatosClima {
  temperatura: number;
  codigoClima: number;
  vientoNudos: number;
  vientoGrados: number;
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
  const descripcion = `San Isidro: ${datos.temperatura}°C, ${ETIQUETA_CLIMA[categoria]}, viento ${datos.vientoNudos} nudos del ${direccionViento(datos.vientoGrados)}`;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums" title={descripcion} aria-label={descripcion}>
      <Icono className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="font-medium text-foreground">{datos.temperatura}°</span>
      <span className="flex items-center gap-1">
        <Wind className="h-3.5 w-3.5" aria-hidden="true" />
        {datos.vientoNudos} kn {direccionViento(datos.vientoGrados)}
      </span>
    </div>
  );
}
