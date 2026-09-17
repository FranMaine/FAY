"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { mensajeDeError } from "@/lib/utils";

interface ErrorLogItem {
  id: string;
  contexto: string;
  mensaje: string;
  stack: string | null;
  createdAt: string;
}

// Monitoreo de errores casero (ver handleApiError en src/lib/api-error.ts):
// sin un servicio externo (Sentry, etc. -necesitaría una cuenta/DSN que no
// tenemos), cada error no esperado de una API route queda guardado acá.
// No es tan completo como un servicio dedicado (sin alertas por mail/
// Slack, sin agrupar errores repetidos), pero es una forma real de
// enterarse de que algo rompió en producción sin depender de que un
// usuario escriba para avisar.
export default function AdminErroresPage() {
  const [errores, setErrores] = useState<ErrorLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/errores");
      if (!res.ok) throw new Error("No se pudieron cargar los errores");
      setErrores(await res.json());
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  async function borrarUno(id: string) {
    await fetch(`/api/admin/errores?id=${id}`, { method: "DELETE" });
    setErrores((prev) => prev.filter((e) => e.id !== id));
  }

  async function borrarTodos() {
    await fetch("/api/admin/errores", { method: "DELETE" });
    setErrores([]);
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <AlertTriangleIcon className="w-8 h-8 text-amber-500" />
              Errores del sistema
            </h1>
            <p className="text-muted-foreground text-lg">
              Últimos {errores.length} errores no esperados de las APIs del sitio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cargar} className="gap-2">
              <RefreshCwIcon className="w-4 h-4" /> Actualizar
            </Button>
            {errores.length > 0 && (
              <ConfirmDeleteButton label="Borrar todos" confirmLabel="¿Borrar todos?" onConfirm={borrarTodos} />
            )}
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : errores.length === 0 ? (
          <Card className="bg-surface border-border text-center py-12">
            <CardContent className="text-muted-foreground">
              Sin errores registrados. Buena señal.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {errores.map((e) => (
              <Card key={e.id} className="bg-surface border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-primary">{e.contexto}</p>
                      <p className="font-medium text-sm break-words">{e.mensaje}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(e.createdAt).toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {e.stack && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandido(expandido === e.id ? null : e.id)}
                        >
                          {expandido === e.id ? "Ocultar" : "Stack"}
                        </Button>
                      )}
                      <ConfirmDeleteButton onConfirm={() => borrarUno(e.id)} />
                    </div>
                  </div>
                  {expandido === e.id && e.stack && (
                    <pre className="text-xs bg-background rounded-md p-3 overflow-x-auto text-muted-foreground whitespace-pre-wrap">
                      {e.stack}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
