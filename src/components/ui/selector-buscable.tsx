"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface OpcionBuscable {
  id: string;
  label: string;
}

interface SelectorBuscableProps {
  id?: string;
  opciones: OpcionBuscable[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Quita acentos y pasa a minúsculas para que "náutico" encuentre "Nautico".
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Selector con buscador inline para listas largas (ej: clubes). Escribís y
// se filtra; click (o Enter con una sola coincidencia) para elegir. Mismo
// alto/estilo que los <select> del resto del admin para que no se note el
// cambio.
export function SelectorBuscable({ id, opciones, value, onChange, placeholder = "Buscar...", className }: SelectorBuscableProps) {
  const listaId = useId();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");

  const etiquetaActual = opciones.find((o) => o.id === value)?.label ?? "";

  const filtradas = useMemo(() => {
    const q = normalizar(texto);
    if (!q) return opciones;
    return opciones.filter((o) => normalizar(o.label).includes(q));
  }, [opciones, texto]);

  function elegir(opcion: OpcionBuscable) {
    onChange(opcion.id);
    setTexto("");
    setAbierto(false);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-controls={listaId}
        aria-expanded={abierto}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={abierto ? texto : etiquetaActual}
        onFocus={() => {
          setTexto("");
          setAbierto(true);
        }}
        onBlur={() => setAbierto(false)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAbierto(false);
          if (e.key === "Enter" && abierto && filtradas.length === 1) {
            e.preventDefault();
            elegir(filtradas[0]);
          }
        }}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {abierto && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</li>
          ) : (
            filtradas.map((o) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(o);
                }}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-surface-hover",
                  o.id === value && "font-medium text-primary"
                )}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
