"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2Icon, MailIcon, MessageSquareReplyIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { mensajeDeError } from "@/lib/utils";

interface Item {
  id: string;
  asunto: string;
  mensaje: string;
  createdAt: string;
  respuesta: string | null;
  respondidoEn: string | null;
  respuestaLeida: boolean;
}

// Mensajes que la persona mandó por /contacto con su cuenta, y la respuesta
// del equipo (que además le llegó por mail). Al abrir la pantalla las
// respuestas se marcan como vistas y se apaga el globito de la barra.
export default function MisMensajesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/mis-mensajes");
        if (!res.ok) throw new Error("No se pudieron cargar tus mensajes");
        setItems(await res.json());
        void fetch("/api/mis-mensajes", { method: "PATCH" }).then(() => window.dispatchEvent(new Event("mensajes-leidos")));
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <MailIcon className="w-7 h-7 text-primary" /> Mis mensajes
          </h1>
          <p className="text-muted-foreground">Lo que nos escribiste y lo que te respondimos.</p>
        </header>

        {error && <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>}

        {cargando ? (
          <div className="flex justify-center py-12"><Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card className="bg-surface border-border text-center py-10">
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">Todavía no mandaste ningún mensaje con esta cuenta.</p>
              <Link href="/contacto" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover">Escribirnos</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((m) => (
              <Card key={m.id} className="bg-surface border-border">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold">{m.asunto}</p>
                    <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("es-AR")}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{m.mensaje}</p>
                  {m.respuesta ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-1">
                      <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                        <MessageSquareReplyIcon className="w-3.5 h-3.5" /> Respuesta
                        {m.respondidoEn ? ` · ${new Date(m.respondidoEn).toLocaleString("es-AR")}` : ""}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{m.respuesta}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Todavía sin respuesta.</p>
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
