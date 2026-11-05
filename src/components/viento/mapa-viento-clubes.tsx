"use client";

import { useEffect, useRef, useState } from "react";

export interface ClubEnMapa {
  // Sin id (si la base no respondió) el marcador sale igual, pero sin enlace a la ficha.
  id?: string;
  nombre: string;
  sigla: string;
  // Escudo cargado por un admin; sin él el marcador es la sigla del club.
  logoUrl?: string | null;
  latitud: number;
  longitud: number;
}

interface Props {
  clave: string;
  latitud: number;
  longitud: number;
  // Slug del lugar que muestra la página: solo ahí se centra el mapa en TU club.
  lugarSlug: string;
  clubes: ClubEnMapa[];
}

// Mapa de viento de Windy (Map Forecast API) con un marcador por club (su escudo,
// o la sigla si no tiene). A diferencia del embed simple, deja agregar marcadores
// propios. La API necesita Leaflet 1.4.0 cargado antes que su propio script
// (libBoot.js) y un <div id="windy">. La clave es pública por diseño (viaja al
// navegador) y se restringe por dominio desde api.windy.com.
const LEAFLET = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.js";
const WINDY = "https://api.windy.com/assets/map-forecast/libBoot.js";

type WindyMap = { setView: (ll: [number, number], z: number) => void };
type Marcador = {
  bindPopup: (el: HTMLElement) => Marcador;
  addTo: (m: unknown) => Marcador;
  getElement: () => HTMLElement | undefined;
};
type Leaflet = {
  divIcon: (o: object) => unknown;
  marker: (ll: [number, number], o: object) => Marcador;
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

const TAMANO = 34;

// Escudo redondo con borde blanco; si no hay escudo (o no carga), la sigla en un
// círculo azul. Se arma con elementos del DOM (no con HTML en texto) para no
// meter nunca texto del club como código.
function iconoDelClub(club: ClubEnMapa): HTMLElement {
  const marco = document.createElement("div");
  marco.title = club.nombre;
  marco.style.cssText = `width:${TAMANO}px;height:${TAMANO}px;margin:-${TAMANO / 2}px 0 0 -${TAMANO / 2}px;border-radius:9999px;border:2px solid #fff;background:#2563eb;box-shadow:0 1px 5px rgba(0,0,0,.55);overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font:700 10px system-ui;transition:transform .15s`;
  const poner = (texto: string) => {
    marco.replaceChildren(document.createTextNode(texto));
  };
  if (club.logoUrl) {
    const img = document.createElement("img");
    img.src = club.logoUrl;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:contain;background:#fff";
    img.addEventListener("error", () => poner(club.sigla));
    marco.append(img);
  } else {
    poner(club.sigla);
  }
  return marco;
}

function resaltar(marco: HTMLElement) {
  marco.style.borderColor = "#f59e0b";
  marco.style.boxShadow = "0 0 0 3px rgba(245,158,11,.55), 0 1px 6px rgba(0,0,0,.6)";
  marco.style.transform = "scale(1.25)";
  marco.style.zIndex = "1000";
  marco.parentElement?.style.setProperty("z-index", "1000");
}

export function MapaVientoClubes({ clave, latitud, longitud, lugarSlug, clubes }: Props) {
  const mapaRef = useRef<WindyMap | null>(null);
  const [error, setError] = useState(false);
  const inicial = useRef({ latitud, longitud, lugarSlug, clubes });

  useEffect(() => {
    let cancelado = false;
    const { latitud: lat, longitud: lon, lugarSlug: slugPagina, clubes: lista } = inicial.current;
    // Cuál es tu club: se pide en paralelo con la carga del mapa.
    const miClub: Promise<{ slug?: string; club?: string | null } | null> = fetch("/api/mi-lugar")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

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
          const marcos = new Map<string, { marco: HTMLElement; club: ClubEnMapa }>();
          for (const club of lista) {
            const marco = iconoDelClub(club);
            L.marker([club.latitud, club.longitud], { icon: L.divIcon({ className: "", html: marco, iconSize: [0, 0] }) })
              .bindPopup(popupDelClub(club))
              .addTo(map);
            marcos.set(club.sigla, { marco, club });
          }
          void miClub.then((mio) => {
            if (cancelado || !mio?.club) return;
            const propio = marcos.get(mio.club.toUpperCase());
            if (!propio) return;
            resaltar(propio.marco);
            if (mio.slug === slugPagina) map.setView([propio.club.latitud, propio.club.longitud], 11);
          });
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
