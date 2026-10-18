"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { LayoutGridIcon, SearchIcon, XIcon } from "lucide-react";
import { ClaseIcon, slugDeClase } from "@/components/icons/clase-icons";
import { cn } from "@/lib/utils";

interface RankingFiltersProps {
  clases: { id: string; nombre: string }[];
  anios: number[];
  currentClaseId: string;
  currentAnio: number;
  // Si viene, se dibuja arriba un buscador de texto (parámetro "q" de la URL).
  // Solo lo usa el explorador de campeonatos.
  currentBusqueda?: string;
}

// Iniciales de una clase que no tiene logo entre los 10 procesados (ver
// clase-icons.tsx) -mismo criterio que ClubAvatar para clubes sin escudo:
// mejor dos letras que un espacio vacío o un ícono genérico repetido.
function inicialesDeClase(nombre: string): string {
  const limpio = nombre.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function RankingFilters({ clases, anios, currentClaseId, currentAnio, currentBusqueda }: RankingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // startTransition mantiene el chip recién clickeado marcado como activo
  // mientras carga la data nueva (no espera a que termine para cambiar el
  // estilo, React ya sabe qué click "ganó") y deja isPending para avisar
  // que hay algo en camino -sin esto el cambio de categoría se sentía
  // instantáneo en el chip pero el contenido de abajo tardaba en aparecer
  // sin ninguna señal de que se había registrado el click.
  const [isPending, startTransition] = useTransition();

  // En celular la fila de clases se desliza: al entrar (o al cambiar de clase)
  // se centra la activa, para no tener que buscarla deslizando. scrollTo en la
  // propia fila (no scrollIntoView) para que la página no salte de lugar.
  const filaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fila = filaRef.current;
    const activo = fila?.querySelector<HTMLElement>("[data-activa]");
    if (!fila || !activo || fila.scrollWidth <= fila.clientWidth) return;
    fila.scrollTo({ left: activo.offsetLeft - (fila.clientWidth - activo.offsetWidth) / 2, behavior: "auto" });
  }, [currentClaseId]);

  // Buscador de texto: se escribe en un estado local (para que el cursor no
  // salte mientras la URL se actualiza) y recién a los 300 ms sin teclear se
  // pasa al parámetro "q", que filtra del lado del servidor.
  const [texto, setTexto] = useState(currentBusqueda ?? "");
  const ultimoEnviado = useRef(currentBusqueda ?? "");
  useEffect(() => {
    if (currentBusqueda === undefined || texto.trim() === ultimoEnviado.current.trim()) return;
    const t = setTimeout(() => {
      ultimoEnviado.current = texto;
      const params = new URLSearchParams(searchParams.toString());
      if (texto.trim()) params.set("q", texto.trim());
      else params.delete("q");
      startTransition(() => router.replace("?" + params.toString()));
    }, 300);
    return () => clearTimeout(t);
  }, [texto, currentBusqueda, router, searchParams]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-surface border border-border rounded-2xl mb-8">
      {currentBusqueda !== undefined && (
        <div className="space-y-1.5">
          <label htmlFor="buscar-campeonato" className="text-sm font-medium text-muted-foreground">Buscar</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="buscar-campeonato"
              type="search"
              inputMode="search"
              autoComplete="off"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nombre del campeonato, club sede, clase o año…"
              className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
            />
            {texto && (
              <button
                type="button"
                aria-label="Borrar búsqueda"
                onClick={() => setTexto("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              >
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="space-y-1.5 min-w-0">
        <span id="filtro-clase-label" className="text-sm font-medium text-muted-foreground">Clase</span>
        {/* Antes era un <select> nativo -acá el logo de cada clase importa
            más que el nombre para reconocerla de un vistazo, y un <select>
            no puede mostrar imágenes dentro de sus opciones en ningún
            navegador. Chips en vez de eso; "Todas" no tiene logo propio (no
            representa ninguna clase real) y las clases sin uno de los 10
            logos procesados caen a sus iniciales, igual que ClubAvatar con
            los clubes sin escudo. Con la fila ocupando todo el ancho, ya
            entran varias por fila -mejor que envuelvan (se ven todas de
            entrada) a que haya que scrollear para encontrar una. */}
        {/* En celular: UNA fila que se desliza hacia los costados (con la clase
            activa centrada al entrar) en vez de 6 filas de chips que se comían
            más de una pantalla antes de llegar a la lista. Desde sm vuelven a
            envolver todas a la vista. */}
        <div
          ref={filaRef}
          role="group"
          aria-labelledby="filtro-clase-label"
          className="-mx-4 flex snap-x items-start gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {clases.map((c) => {
            const activa = currentClaseId === c.id;
            const tieneLogo = c.id !== "ALL" && slugDeClase(c.nombre) !== null;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={activa}
                data-activa={activa || undefined}
                onClick={() => startTransition(() => router.replace("?" + createQueryString("clase", c.id)))}
                className={cn(
                  "flex shrink-0 snap-start flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-[background-color,border-color,opacity] duration-150",
                  activa
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  isPending && activa && "opacity-60"
                )}
              >
                {c.id === "ALL" ? (
                  <LayoutGridIcon className="h-7 w-7" />
                ) : tieneLogo ? (
                  <ClaseIcon nombreClase={c.nombre} className="h-7 w-7 object-contain" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {inicialesDeClase(c.nombre)}
                  </span>
                )}
                {/* Antes truncaba a una línea con "..." -"Optimist
                    Principiantes" quedaba como "Optim...", ilegible. Ahora
                    envuelve en hasta 2 líneas (w-20 = 80px, suficiente para
                    "Principiantes"/"(Laser Radial)" en la segunda línea de
                    los nombres reales más largos) en vez de cortar texto. */}
                <span className="w-20 text-center text-xs font-medium leading-tight">{c.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1 sm:max-w-xs">
        <label htmlFor="filtro-anio" className="text-sm font-medium text-muted-foreground">Temporada (Año)</label>
        <select
          id="filtro-anio"
          className="w-full h-11 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          value={currentAnio.toString()}
          onChange={(e) => {
            startTransition(() => router.replace("?" + createQueryString("anio", e.target.value)));
          }}
        >
          {anios.map((a) => (
            <option key={a} value={a.toString()}>{a === 0 ? "Todos los años" : a}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
