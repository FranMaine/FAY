"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, Loader2Icon, UserIcon } from "lucide-react";

interface ResultadoBusqueda {
  id: string;
  nombre: string;
  pais: string | null;
  club: { nombre: string } | null;
}

export function SailorSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultadoBusqueda[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelado = false;

    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        // Si el usuario ya siguió tipeando, esta respuesta quedó vieja -sin
        // este chequeo, una búsqueda más rápida disparada después podía
        // resolver antes que una más lenta anterior, y esta última
        // pisoteaba los resultados correctos con los de la query vieja.
        if (cancelado) return;
        setResults(data);
        setIsOpen(true);
      } catch (e) {
        if (!cancelado) console.error(e);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto z-50">
      {/* Píldora blanca con el botón "Buscar" pegado a la derecha (en vez
          del Input genérico de siempre) -así funciona igual de bien sobre
          un fondo con foto/video como el del hero, no solo sobre el fondo
          liso del resto del sitio. El submit del form navega al primer
          resultado del dropdown en vivo (mismo destino que tocarlo de la
          lista) -el botón es un atajo, no reemplaza esa lista. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results.length > 0) {
            setIsOpen(false);
            router.push(`/regatistas/${results[0].id}`);
          }
        }}
        className="flex items-center w-full rounded-full bg-surface shadow-xl p-1.5 sm:p-2 gap-1 sm:gap-2 focus-within:ring-2 focus-within:ring-primary"
      >
        <SearchIcon className="hidden sm:block ml-2.5 w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
        <input
          type="text"
          // Placeholder corto -el largo ("...por nombre o club...") se
          // recortaba a la mitad en pantallas angostas, con el padding y el
          // tamaño de fuente grandes de este input no entraba entero.
          placeholder="Buscar regatista por nombre…"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm sm:text-base py-2.5 sm:py-3 px-3 sm:px-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <Loader2Icon className="w-5 h-5 text-muted-foreground animate-spin shrink-0" aria-hidden="true" />
        )}
        <button
          type="submit"
          disabled={results.length === 0}
          className="shrink-0 rounded-full bg-foreground text-background font-semibold text-sm sm:text-base px-5 sm:px-7 py-2.5 sm:py-3 hover:opacity-90 active:scale-[0.97] transition-[opacity,transform] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          Buscar
        </button>
      </form>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[300px] overflow-y-auto">
          {results.map((reg) => (
            <button
              key={reg.id}
              onClick={() => {
                setIsOpen(false);
                router.push(`/regatistas/${reg.id}`);
              }}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{reg.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {reg.club?.nombre || "Sin club"} {reg.pais ? `• ${reg.pais}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && results.length === 0 && !isLoading && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-xl shadow-2xl p-6 text-center text-muted-foreground">
          No se encontraron regatistas con ese nombre.
        </div>
      )}
    </div>
  );
}
