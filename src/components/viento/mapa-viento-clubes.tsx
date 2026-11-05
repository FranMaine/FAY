"use client";

import { useEffect, useRef, useState } from "react";

export interface ClubEnMapa {
  // Sin id (si la base no respondió) el marcador sale igual, pero sin enlace a la ficha.
  id?: string;
  nombre: string;
  sigla: string;
  latitud: number;
  longitud: number;
}

interface Props {
  clave: string;
  latitud: number;
  longitud: number;
  clubes: ClubEnMapa[];
}

// Mapa de viento de Windy (Map Forecast API) con un marcador por club. A
// diferencia del embed simple, deja agregar marcadores propios. La API necesita
// Leaflet 1.4.0 cargado antes que su propio script (libBoot.js) y un <div id="windy">.
// La clave es pública por diseño (viaja al navegador) y se restringe por dominio
// desde api.windy.com.
const LEAFLET = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.js";
const WINDY = "https://api.windy.com/assets/map-forecast/libBoot.js";

type WindyMap = { setView: (ll: [number, number], z: number) => void };
type Leaflet = {
  divIcon: (o: object) => unknown;
  marker: (ll: [number, number], o: object) => { bindPopup: (el: HTMLElement) => { addTo: (m: unknown) => unknown } };
};
declare global {
  interface Window {
    L?: Leaflet;
    windyInit?: (opts: object, cb: (api: { map: WindyMap; store?: { set: (k: string, v: string) => void } }) => void) => void;
  }
}

function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existente) {
      if (existente.dataset.cargado === "1") return resolve();
      existente.addEventListener("load", () => resolve());
      existente.addEventListener("error", () => reject(new Error(src)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.cargado = "1";
      resolve();
    };
    s.onerror = () => reject(new Error(src));
    document.head.appendChild(s);
  });
}

function popupDelClub(club: ClubEnMapa): HTMLElement {
  const caja = document.createElement("div");
  const titulo = document.createElement("strong");
  titulo.textContent = club.nombre;
  caja.append(titulo);
  if (club.id) {
    const enlace = document.createElement("a");
    enlace.href = `/clubes/${club.id}`;
    enlace.textContent = "Ver el club";
    enlace.style.cssText = "display:block;margin-top:4px;color:#2563eb;text-decoration:underline";
    caja.append(enlace);
  }
  return caja;
}

export function MapaVientoClubes({ clave, latitud, longitud, clubes }: Props) {
  const mapaRef = useRef<WindyMap | null>(null);
  const [error, setError] = useState(false);
  const inicial = useRef({ latitud, longitud, clubes });

  useEffect(() => {
    let cancelado = false;
    const { latitud: lat, longitud: lon, clubes: lista } = inicial.current;
    (async () => {
      try {
        await cargarScript(LEAFLET);
        await cargarScript(WINDY);
        if (cancelado || !window.windyInit || !window.L) return;
        const L = window.L;
        window.windyInit({ key: clave, lat, lon, zoom: 9 }, ({ map, store }) => {
          if (cancelado) return;
          mapaRef.current = map;
          try {
            store?.set("overlay", "wind");
          } catch {
            // si la API cambia estos nombres, queda el viento por defecto
          }
          for (const club of lista) {
            const icono = L.divIcon({
              className: "",
              html: `<div style="background:#2563eb;color:#fff;border:2px solid #fff;border-radius:9999px;padding:2px 7px;font:600 11px system-ui;box-shadow:0 1px 4px rgba(0,0,0,.5);white-space:nowrap;transform:translate(-50%,-50%)">${club.sigla.replace(/[<>&"]/g, "")}</div>`,
              iconSize: [0, 0],
            });
            L.marker([club.latitud, club.longitud], { icon: icono }).bindPopup(popupDelClub(club)).addTo(map);
          }
        });
      } catch {
        if (!cancelado) setError(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [clave]);

  // Al cambiar de lugar (/viento/[lugar]) se recentra sin volver a crear el mapa.
  useEffect(() => {
    mapaRef.current?.setView([latitud, longitud], 9);
  }, [latitud, longitud]);

  if (error) {
    return <p className="text-sm text-muted-foreground">No se pudo cargar el mapa por ahora. Probá de nuevo en un momento.</p>;
  }
  return <div id="windy" className="h-[420px] w-full overflow-hidden rounded-xl border border-border" />;
}
