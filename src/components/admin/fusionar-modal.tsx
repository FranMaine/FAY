"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, MergeIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn, mensajeDeError } from "@/lib/utils";

export interface ItemFusion {
  id: string;
  titulo: string;
  detalle?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tipo: "club" | "regatista";
  /** Devuelve las coincidencias para el texto escrito. */
  buscar: (texto: string) => Promise<ItemFusion[]>;
  onFusionado: () => void;
}

function Selector({ etiqueta, valor, onChange, buscar }: { etiqueta: string; valor: ItemFusion | null; onChange: (v: ItemFusion | null) => void; buscar: Props["buscar"] }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ItemFusion[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (valor) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await buscar(texto.trim());
        if (!cancelado) setResultados(r);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [texto, valor, buscar]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{etiqueta}</p>
      {valor ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{valor.titulo}</p>
            {valor.detalle && <p className="text-xs text-muted-foreground truncate">{valor.detalle}</p>}
          </div>
          <button type="button" aria-label="Cambiar" onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-sm bg-background border border-border rounded-md pl-9 pr-3 py-2"
            />
          </div>
          <div className="max-h-44 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {buscando && <p className="p-3 text-xs text-muted-foreground">Buscando...</p>}
            {!buscando && resultados.length === 0 && <p className="p-3 text-xs text-muted-foreground">Sin resultados</p>}
            {resultados.map((r) => (
              <button key={r.id} type="button" onClick={() => onChange(r)} className="w-full text-left px-3 py-2 hover:bg-background/60">
                <p className="text-sm font-medium truncate">{r.titulo}</p>
                {r.detalle && <p className="text-xs text-muted-foreground truncate">{r.detalle}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// El padre le pasa una `key` distinta cada vez que lo abre, así arranca siempre limpio.
export function FusionarModal({ isOpen, onClose, tipo, buscar, onFusionado }: Props) {
  const [a, setA] = useState<ItemFusion | null>(null);
  const [b, setB] = useState<ItemFusion | null>(null);
  const [conservar, setConservar] = useState<"a" | "b">("a");
  const [fusionando, setFusionando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismo = !!a && !!b && a.id === b.id;
  const listo = !!a && !!b && !mismo;
  const canonico = conservar === "a" ? a : b;
  const duplicado = conservar === "a" ? b : a;
  const plural = tipo === "club" ? "club" : "regatista";

  async function fusionar() {
    if (!canonico || !duplicado) return;
    setFusionando(true);
    setError(null);
    try {
      const url = tipo === "club" ? "/api/admin/clubes/merge" : "/api/admin/regatistas/merge";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicoId: canonico.id, duplicadoIds: [duplicado.id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo fusionar");
      onFusionado();
      onClose();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setFusionando(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !fusionando && onClose()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><MergeIcon className="w-5 h-5 text-primary" /> Fusionar {plural}s</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí dos {plural}s y cuál se conserva: el otro se elimina y todo lo suyo pasa al que queda.
          </p>
        </div>

        <Selector etiqueta="Primero" valor={a} onChange={setA} buscar={buscar} />
        <Selector etiqueta="Segundo" valor={b} onChange={setB} buscar={buscar} />

        {mismo && <p className="text-sm text-red-500">Elegiste el mismo {plural} dos veces.</p>}

        {listo && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">¿Cuál se conserva?</p>
            <div className="grid grid-cols-2 gap-2">
              {([["a", a], ["b", b]] as const).map(([k, item]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setConservar(k)}
                  className={cn("rounded-md border px-3 py-2 text-left text-sm", conservar === k ? "border-primary bg-primary/10" : "border-border")}
                >
                  <span className="block font-medium truncate">{item!.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{conservar === k ? "Se conserva" : "Se elimina"}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              &quot;{duplicado?.titulo}&quot; se elimina y pasa todo a &quot;{canonico?.titulo}&quot;. No se puede deshacer.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={fusionando}>Cancelar</Button>
          <Button onClick={fusionar} disabled={!listo || fusionando} className="gap-2">
            {fusionando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MergeIcon className="w-4 h-4" />}
            Fusionar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
