"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, Loader2Icon, UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SailorSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
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
      <div className="relative flex items-center w-full">
        <SearchIcon className="absolute left-4 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar regatista por nombre o club..."
          className="pl-12 pr-12 py-6 text-lg rounded-full shadow-lg border-2 border-border focus-visible:ring-primary bg-surface/80 backdrop-blur-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <Loader2Icon className="absolute right-4 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

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
