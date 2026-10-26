"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon, UserIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface Resultado {
  id: string;
  nombre: string;
  pais: string | null;
  club: { nombre: string } | null;
}

// Lupa de la barra de navegación: abre un buscador de regatistas desde
// cualquier página (sin tener que volver al inicio). Atajo: Ctrl/Cmd + K o "/"
// fuera de un campo de texto.
export function BuscadorGlobal({ className }: { className?: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const destino = e.target as HTMLElement | null;
      const escribiendo = !!destino && (destino.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(destino.tagName));
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setAbierto(true);
      } else if (e.key === "/" && !escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setAbierto(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
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
    const timer = setTimeout(buscar, 250);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [query, abierto]);

  function cerrar() {
    setAbierto(false);
    setQuery("");
    setResultados([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Buscar regatista"
        title="Buscar regatista (Ctrl + K)"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-90 transition-[transform,color,background-color]",
          className
        )}
      >
        <SearchIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <Modal isOpen={abierto} onClose={cerrar} ariaLabel="Buscar regatista" className="w-full max-w-lg self-start mt-[8dvh]">
        <form
          className="p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (resultados.length > 0) {
              router.push(`/regatistas/${resultados[0].id}`);
              cerrar();
            }
          }}
        >
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="Buscar regatista por nombre o apellido"
              placeholder="Buscar regatista…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // 16px: con menos, Safari en iPhone hace zoom al enfocar el campo.
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            {buscando && <Loader2Icon className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />}
          </div>

          {query.trim().length >= 2 && !buscando && resultados.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">No se encontraron regatistas con ese nombre.</p>
          )}

          {resultados.length > 0 && (
            <ul className="max-h-[50dvh] overflow-y-auto rounded-lg border border-border">
              {resultados.map((r) => (
                <li key={r.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/regatistas/${r.id}`}
                    onClick={cerrar}
                    className="flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.club?.nombre || "Sin club"} {r.pais ? `• ${r.pais}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Escribí un nombre o apellido. Enter abre el primero · Esc cierra.
          </p>
        </form>
      </Modal>
    </>
  );
}
