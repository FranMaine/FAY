"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, SearchIcon, UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface RegatistaEncontrado {
  id: string;
  nombre: string;
  pais: string | null;
  club: { nombre: string } | null;
}

interface Props {
  onSelect: (regatista: RegatistaEncontrado) => void;
  /** Ids que no se ofrecen (ej: los que ya están elegidos). */
  excluir?: ReadonlySet<string>;
  placeholder?: string;
  /** Qué mostrar a la derecha de cada resultado (ej: un botón "Agregar"). */
  accion?: (regatista: RegatistaEncontrado) => React.ReactNode;
}

// Buscador de regatistas con la lista de resultados debajo (sin desplegable
// flotante): lo usan el registro, la pantalla de favoritos y cualquier lugar
// donde haya que elegir a una persona. Mismo endpoint que el buscador del
// inicio (/api/search).
export function BuscadorRegatistas({ onSelect, excluir, placeholder = "Buscar por nombre o apellido…", accion }: Props) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<RegatistaEncontrado[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const buscar = async () => {
      if (query.trim().length < 2) {
        setResultados([]);
        return;
      }
      setBuscando(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelado) setResultados(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    };
    const timer = setTimeout(buscar, 300);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visibles = resultados.filter((r) => !excluir?.has(r.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Buscar regatista"
          placeholder={placeholder}
          className="pl-9 bg-background border-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {buscando && (
          <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" aria-hidden="true" />
        )}
      </div>

      {query.trim().length >= 2 && !buscando && (
        <div className="w-full bg-background border border-border rounded-md overflow-hidden max-h-[260px] overflow-y-auto">
          {visibles.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">No se encontraron regatistas con ese nombre.</p>
          ) : (
            visibles.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left hover:text-primary transition-colors"
                >
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                    <UserIcon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-sm truncate">{r.nombre}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {r.club?.nombre || "Sin club"} {r.pais ? `• ${r.pais}` : ""}
                    </span>
                  </span>
                </button>
                {accion?.(r)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
