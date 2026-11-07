"use client";

import { useEffect, useRef, useState } from "react";
import { direccionViento } from "@/lib/clima";

export interface ClubEnMapa {
  // Sin id (si la base no respondió) el marcador sale igual, pero sin enlace a la ficha.
  id?: string;
  nombre: string;
  sigla: string;
  // Escudo cargado por un admin; sin él el marcador es la sigla del club.
  logoUrl?: string | null;
  latitud: number;
  longitud: number;
  // Viento actual del modelo en el club: se muestra bajo el escudo.
  viento?: { nudos: number; grados: number } | null;
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

type Punto = { x: number; y: number };
type LatLng = { lat: number; lng: number };
type Capa = { addTo: (m: unknown) => Capa };
type WindyMap = {
  setView: (ll: [number, number], z: number) => void;
  on: (evento: string, fn: (e: { latlng: LatLng }) => void) => void;
  latLngToContainerPoint: (ll: [number, number]) => Punto;
  containerPointToLatLng: (p: [number, number]) => LatLng;
  removeLayer: (capa: unknown) => void;
};
type WindyPicker = {
  open: (ll: { lat: number; lon: number }) => void;
  on: (evento: string, fn: () => void) => void;
  getParams: () => { lat: number; lon: number; values: number[] | null; overlay?: string } | null;
};
type WindyUtils = { wind2obj: (v: number[]) => { wind: number; dir: number } };
type Marcador = {
  bindPopup: (el: HTMLElement) => Marcador;
  addTo: (m: unknown) => Marcador;
  getElement: () => HTMLElement | undefined;
  setLatLng: (ll: [number, number]) => Marcador;
};
type Leaflet = {
  divIcon: (o: object) => unknown;
  marker: (ll: [number, number], o: object) => Marcador;
  polyline: (ll: [number, number][], o: object) => Capa;
  circleMarker: (ll: [number, number], o: object) => Capa;
};
declare global {
  interface Window {
    L?: Leaflet;
    W?: { picker?: WindyPicker };
    windyInit?: (opts: object, cb: (api: { map: WindyMap; picker?: WindyPicker; utils?: WindyUtils; store?: { set: (k: string, v: string) => void } }) => void) => void;
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
  if (club.viento) {
    const viento = document.createElement("div");
    viento.style.cssText = "margin-top:6px;font-size:12px";
    viento.textContent = `Viento: ${club.viento.nudos} kn del ${direccionViento(club.viento.grados)} (estimado del modelo)`;
    caja.insertBefore(viento, caja.children[1] ?? null);
  }
  return caja;
}

const TAMANO = 34;

// Escudo redondo con borde blanco; si no hay escudo (o no carga), la sigla en un
// círculo azul. Debajo, el viento actual del modelo en ese punto. Se arma con
// elementos del DOM (no con HTML en texto) para no meter nunca texto del club
// como código.
function iconoDelClub(club: ClubEnMapa): { raiz: HTMLElement; circulo: HTMLElement } {
  const raiz = document.createElement("div");
  raiz.style.cssText = `position:relative;width:${TAMANO}px;height:${TAMANO}px;margin:-${TAMANO / 2}px 0 0 -${TAMANO / 2}px`;
  const circulo = document.createElement("div");
  circulo.title = club.nombre;
  circulo.style.cssText = `width:100%;height:100%;border-radius:9999px;border:2px solid #fff;background:#2563eb;box-shadow:0 1px 5px rgba(0,0,0,.55);overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font:700 10px system-ui;transition:transform .15s`;
  const poner = (texto: string) => {
    circulo.replaceChildren(document.createTextNode(texto));
  };
  if (club.logoUrl) {
    const img = document.createElement("img");
    img.src = club.logoUrl;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:contain;background:#fff";
    img.addEventListener("error", () => poner(club.sigla));
    circulo.append(img);
  } else {
    poner(club.sigla);
  }
  raiz.append(circulo);

  if (club.viento) {
    const etiqueta = document.createElement("div");
    etiqueta.title = `Viento en ${club.nombre}: del ${direccionViento(club.viento.grados)}, ${club.viento.nudos} kn (estimado del modelo)`;
    etiqueta.style.cssText = "position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:3px;display:flex;align-items:center;gap:3px;white-space:nowrap;padding:1px 6px;border-radius:9999px;background:rgba(15,23,42,.88);color:#fff;font:700 10px system-ui;box-shadow:0 1px 3px rgba(0,0,0,.5);pointer-events:none";
    // La flecha apunta hacia donde VA el viento, como en el resto del sitio.
    const flecha = document.createElement("span");
    flecha.textContent = "↑";
    flecha.style.cssText = `display:inline-block;transform:rotate(${club.viento.grados + 180}deg);line-height:1`;
    etiqueta.append(flecha, document.createTextNode(`${club.viento.nudos} kn`));
    raiz.append(etiqueta);
  }
  return { raiz, circulo };
}

function resaltar(circulo: HTMLElement, raiz: HTMLElement) {
  circulo.style.borderColor = "#f59e0b";
  circulo.style.boxShadow = "0 0 0 3px rgba(245,158,11,.55), 0 1px 6px rgba(0,0,0,.6)";
  circulo.style.transform = "scale(1.25)";
  raiz.parentElement?.style.setProperty("z-index", "1000");
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
        window.windyInit({ key: clave, lat, lon, zoom: 9 }, ({ map, store, picker }) => {
          if (cancelado) return;
          mapaRef.current = map;
          try {
            store?.set("overlay", "wind");
          } catch {
            // si la API cambia estos nombres, queda el viento por defecto
          }
          // Tocar cualquier punto del mapa pone un pin con el viento de ahí (el panel
          // del pin es de Windy). Tocar un club abre su ficha, no el pin.
          const pin = picker ?? window.W?.picker;
          if (pin) map.on("click", (e) => pin.open({ lat: e.latlng.lat, lon: e.latlng.lng }));
          const marcos = new Map<string, { circulo: HTMLElement; raiz: HTMLElement; club: ClubEnMapa }>();
          const marcadores: { marcador: Marcador; club: ClubEnMapa }[] = [];
          let extras: unknown[] = [];

          // Los escudos (con su viento debajo) no deben pisarse nunca, a ningún zoom:
          // se parte de la posición real en pantalla y se empujan de a pares, por el
          // eje de menor solapamiento, hasta que no quede ningún par solapado. Los
          // que se corren quedan unidos por una línea fina a su ubicación real.
          const separar = () => {
            for (const e of extras) map.removeLayer(e);
            extras = [];
            const ANCHO = 64; // ancho de la etiqueta del viento (más ancha que el escudo)
            const ALTO = 58; // escudo + etiqueta debajo
            const real = marcadores.map((m) => map.latLngToContainerPoint([m.club.latitud, m.club.longitud]));
            const pos = real.map((p, i) => ({ x: p.x + (i % 2 ? 0.01 : -0.01), y: p.y }));
            for (let it = 0; it < 400; it++) {
              let movido = false;
              for (let i = 0; i < pos.length; i++) {
                for (let j = i + 1; j < pos.length; j++) {
                  const dx = pos[j].x - pos[i].x;
                  const dy = pos[j].y - pos[i].y;
                  const ox = ANCHO - Math.abs(dx);
                  const oy = ALTO - Math.abs(dy);
                  if (ox <= 0 || oy <= 0) continue;
                  movido = true;
                  if (ox < oy) {
                    const d = (ox / 2 + 0.5) * (dx >= 0 ? 1 : -1);
                    pos[i].x -= d;
                    pos[j].x += d;
                  } else {
                    const d = (oy / 2 + 0.5) * (dy >= 0 ? 1 : -1);
                    pos[i].y -= d;
                    pos[j].y += d;
                  }
                }
              }
              if (!movido) break;
            }
            marcadores.forEach((m, i) => {
              const corrido = Math.hypot(pos[i].x - real[i].x, pos[i].y - real[i].y) > 6;
              if (!corrido) {
                m.marcador.setLatLng([m.club.latitud, m.club.longitud]);
                return;
              }
              const destino = map.containerPointToLatLng([pos[i].x, pos[i].y]);
              m.marcador.setLatLng([destino.lat, destino.lng]);
              extras.push(L.polyline([[m.club.latitud, m.club.longitud], [destino.lat, destino.lng]], { color: "#0f172a", weight: 1.5, opacity: 0.7, interactive: false }).addTo(map));
              extras.push(L.circleMarker([m.club.latitud, m.club.longitud], { radius: 3, weight: 1, color: "#fff", fillColor: "#0f172a", fillOpacity: 1, interactive: false }).addTo(map));
            });
          };

          for (const club of lista) {
            const { raiz, circulo } = iconoDelClub(club);
            // Leaflet 1.4 solo acepta texto en `html` (un elemento se vería como
            // "[object HTMLDivElement]"): el ícono se crea vacío y el escudo se
            // agrega al elemento del marcador una vez puesto en el mapa.
            const marcador = L.marker([club.latitud, club.longitud], { icon: L.divIcon({ className: "", html: "", iconSize: [0, 0] }) })
              .bindPopup(popupDelClub(club))
              .addTo(map);
            marcador.getElement()?.append(raiz);
            marcos.set(club.sigla, { circulo, raiz, club });
            marcadores.push({ marcador, club });
          }
          separar();
          map.on("zoomend", separar);
          void miClub.then((mio) => {
            if (cancelado || !mio?.club) return;
            const propio = marcos.get(mio.club.toUpperCase());
            if (!propio) return;
            resaltar(propio.circulo, propio.raiz);
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
