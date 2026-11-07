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
  userId: string | null;
  respuesta: string | null;
  respondidoEn: string | null;
}

export default function AdminMensajesPage() {
  const [mensajes, setMensajes] = useState<MensajeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

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

  async function responder(id: string) {
    const texto = (borrador[id] ?? "").trim();
    if (texto.length < 2) return;
    setEnviando(id);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch(`/api/admin/mensajes/${id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta: texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la respuesta");
      setMensajes((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.mensaje, leido: true } : m)));
      setBorrador((prev) => ({ ...prev, [id]: "" }));
      setAviso(data.enApp ? "Respuesta enviada por mail y a su cuenta de la app." : "Respuesta enviada por mail (no tiene cuenta en la app).");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(null);
    }
  }

  const sinLeer = mensajes.filter((m) => !m.leido).length;

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
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

        {aviso && <div role="status" className="bg-primary/10 border border-primary/40 text-primary text-sm p-3 rounded-md">{aviso}</div>}
        {error && <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>}

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
                        {m.respuesta && <span className="text-[10px] uppercase tracking-wide text-primary shrink-0">Respondido</span>}
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
                    <div className="border-t border-border pt-2 mt-2 space-y-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{m.mensaje}</p>
                      {m.respuesta && (
                        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-1">
                          <p className="text-xs font-medium text-primary">
                            Respondido{m.respondidoEn ? ` · ${new Date(m.respondidoEn).toLocaleString("es-AR")}` : ""}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{m.respuesta}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <textarea
                          value={borrador[m.id] ?? ""}
                          onChange={(e) => setBorrador((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          rows={3}
                          maxLength={4000}
                          placeholder={m.respuesta ? "Escribir otra respuesta…" : "Escribí tu respuesta…"}
                          className="w-full rounded-md border border-border bg-background p-2 text-sm"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">
                            Le llega por mail a {m.email}{m.userId ? " y a su cuenta de la app" : " (y a su cuenta de la app, si tiene una con ese mail)"}.
                          </p>
                          <Button type="button" size="sm" disabled={enviando === m.id || (borrador[m.id] ?? "").trim().length < 2} onClick={() => responder(m.id)}>
                            {enviando === m.id ? "Enviando…" : "Responder"}
                          </Button>
                        </div>
                      </div>
                    </div>
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
