"use client";

import { useEffect, useState } from "react";
import { MailIcon, Loader2Icon, RefreshCwIcon, CircleIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn, mensajeDeError } from "@/lib/utils";

interface MensajeItem {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  leido: boolean;
  createdAt: string;
}

export default function AdminMensajesPage() {
  const [mensajes, setMensajes] = useState<MensajeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mensajes");
      if (!res.ok) throw new Error("No se pudieron cargar los mensajes");
      setMensajes(await res.json());
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

  async function toggleLeido(id: string, leido: boolean) {
    const res = await fetch(`/api/admin/mensajes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leido }),
    });
    if (res.ok) setMensajes((prev) => prev.map((m) => (m.id === id ? { ...m, leido } : m)));
  }

  async function borrar(id: string) {
    await fetch(`/api/admin/mensajes/${id}`, { method: "DELETE" });
    setMensajes((prev) => prev.filter((m) => m.id !== id));
  }

  const sinLeer = mensajes.filter((m) => !m.leido).length;

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <MailIcon className="w-8 h-8 text-primary" />
              Mensajes
            </h1>
            <p className="text-muted-foreground text-lg">
              {mensajes.length} mensajes recibidos por /contacto{sinLeer > 0 ? `, ${sinLeer} sin leer` : ""}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar} className="gap-2">
            <RefreshCwIcon className="w-4 h-4" /> Actualizar
          </Button>
        </header>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : mensajes.length === 0 ? (
          <Card className="bg-surface border-border text-center py-12">
            <CardContent><div className="text-muted-foreground">Todavía no llegó ningún mensaje.</div></CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mensajes.map((m) => (
              <Card key={m.id} className={cn("bg-surface border-border", !m.leido && "border-primary/40")}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandido(expandido === m.id ? null : m.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {!m.leido && <CircleIcon className="w-2 h-2 fill-primary text-primary shrink-0" />}
                        <p className="font-semibold truncate">{m.asunto}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.nombre} · {m.email} · {new Date(m.createdAt).toLocaleString("es-AR")}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        aria-label={m.leido ? "Marcar como no leído" : "Marcar como leído"}
                        onClick={() => toggleLeido(m.id, !m.leido)}
                      >
                        <CheckCircle2Icon className={cn("w-4 h-4", m.leido && "text-primary")} />
                      </Button>
                      <ConfirmDeleteButton onConfirm={() => borrar(m.id)} />
                    </div>
                  </div>
                  {expandido === m.id && (
                    <p className="text-sm text-foreground whitespace-pre-wrap border-t border-border pt-2 mt-2">{m.mensaje}</p>
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
