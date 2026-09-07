"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Loader2Icon, MergeIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { mensajeDeError } from "@/lib/utils";

interface RegatistaDup {
  id: string;
  nombre: string;
  club: string | null;
  resultadosCount: number;
  createdAt: string;
}

interface Grupo {
  nombreNormalizado: string;
  regatistas: RegatistaDup[];
}

export default function DuplicadosPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Por grupo (índice), qué id quedó elegido como canónico.
  const [canonicoPorGrupo, setCanonicoPorGrupo] = useState<Record<number, string>>({});
  const [fusionando, setFusionando] = useState<number | null>(null);
  const [exito, setExito] = useState<Record<number, string>>({});

  const fetchGrupos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regatistas/duplicados");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la lista");
      setGrupos(data.grupos || []);
      // Por defecto, el canónico sugerido es el más viejo (primer creado) -
      // suele ser el que ya tiene el historial "principal" de esa persona.
      const iniciales: Record<number, string> = {};
      (data.grupos || []).forEach((g: Grupo, i: number) => {
        iniciales[i] = g.regatistas[0]?.id;
      });
      setCanonicoPorGrupo(iniciales);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGrupos();
  }, [fetchGrupos]);

  const fusionar = async (grupoIdx: number) => {
    const grupo = grupos[grupoIdx];
    const canonicoId = canonicoPorGrupo[grupoIdx];
    if (!canonicoId) return;

    const duplicadoIds = grupo.regatistas.map((r) => r.id).filter((id) => id !== canonicoId);
    if (duplicadoIds.length === 0) return;

    setFusionando(grupoIdx);
    setError(null);
    try {
      const res = await fetch("/api/admin/regatistas/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicoId, duplicadoIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo fusionar");

      setExito((prev) => ({
        ...prev,
        [grupoIdx]: `Fusionado: ${data.resumen.resultadosMovidos} resultado(s) movidos, ${data.resumen.duplicadosBorrados} ficha(s) duplicada(s) borrada(s).`,
      }));
      // Sacamos el grupo ya resuelto de la lista en vez de recargar todo.
      setGrupos((prev) => prev.filter((_, i) => i !== grupoIdx));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setFusionando(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/admin/regatistas">
            <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Volver a Regatistas
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Regatistas Duplicados</h1>
          <p className="text-muted-foreground">
            Fichas con el mismo nombre (ignorando mayúsculas y espacios de más) que probablemente son la misma persona
            cargada más de una vez -típico al reimportar un campeonato o cuando un nombre viene con algún carácter raro
            adentro. Elegí cuál ficha se queda como la &quot;buena&quot; (canónica): todo el historial de las otras se mueve ahí
            y las duplicadas se borran.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-surface/50 text-muted-foreground">
            <CheckCircleIcon className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-lg font-medium">Sin duplicados</p>
            <p className="text-sm">No encontramos regatistas con el mismo nombre repetido.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo, idx) => (
              <div key={grupo.nombreNormalizado} className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-semibold mb-3">{grupo.regatistas[0]?.nombre}</h3>

                {exito[idx] ? (
                  <p className="text-sm text-green-500 flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" /> {exito[idx]}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      {grupo.regatistas.map((r) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 cursor-pointer text-sm"
                        >
                          <input
                            type="radio"
                            name={`canonico-${idx}`}
                            checked={canonicoPorGrupo[idx] === r.id}
                            onChange={() => setCanonicoPorGrupo((prev) => ({ ...prev, [idx]: r.id }))}
                            className="accent-primary"
                          />
                          <span className="font-medium">{r.nombre}</span>
                          <span className="text-muted-foreground">club: {r.club || "-"}</span>
                          <span className="text-muted-foreground">{r.resultadosCount} resultado(s)</span>
                          <span className="text-xs text-muted-foreground">
                            creado {new Date(r.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </label>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => fusionar(idx)}
                      disabled={fusionando === idx}
                      className="gap-2"
                    >
                      {fusionando === idx ? (
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                      ) : (
                        <MergeIcon className="w-4 h-4" />
                      )}
                      Fusionar en la ficha seleccionada
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
