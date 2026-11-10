"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2Icon, LockIcon, MessageCircleIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BurbujasChat, type EntradaChat } from "@/components/contacto/burbujas-chat";
import { mensajeDeError } from "@/lib/utils";
import { intervaloVisible } from "@/lib/intervalo-visible";

interface Conversacion {
  nombre: string;
  asunto: string;
  mensaje: string;
  createdAt: string;
  estado: "ABIERTO" | "CERRADO";
  entradas: EntradaChat[];
}

const REFRESCO_MS = 20_000;

// Chat de una conversación de /contacto, para quien escribió: se entra con el
// link privado del mail (o desde Mis mensajes). Se puede responder hasta que
// el admin cierra la conversación.
export default function ChatContactoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const cantidad = useRef(0);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacto/chat/${token}`, { cache: "no-store" });
      if (res.status === 404) {
        setNoExiste(true);
        return;
      }
      if (!res.ok) return;
      setConv(await res.json());
      window.dispatchEvent(new Event("mensajes-leidos"));
    } catch {
      // sin red: se queda con lo que ya tenía
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    return intervaloVisible(cargar, REFRESCO_MS);
  }, [cargar]);

  useEffect(() => {
    const total = conv ? conv.entradas.length : 0;
    if (total !== cantidad.current) {
      cantidad.current = total;
      fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [conv]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacto/chat/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje");
      setTexto("");
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err));
      await cargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground p-4 md:p-10 flex items-start justify-center">
      <div className="w-full max-w-xl mt-4 space-y-4">
        {cargando ? (
          <div className="flex justify-center py-16"><Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : noExiste || !conv ? (
          <Card className="bg-surface border-border text-center py-10">
            <CardContent className="space-y-3">
              <p className="font-medium">No encontramos esta conversación.</p>
              <p className="text-sm text-muted-foreground">Revisá que el link esté completo, o escribinos de nuevo.</p>
              <Link href="/contacto" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover">Ir a Contacto</Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-surface border-border rounded-2xl shadow-xl">
            <CardContent className="p-4 md:p-6 space-y-4">
              <header className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <MessageCircleIcon className="w-5 h-5 text-primary shrink-0" /> {conv.asunto}
                </h1>
                {conv.estado === "CERRADO" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><LockIcon className="w-3.5 h-3.5" /> Conversación cerrada</p>
                )}
              </header>

              <BurbujasChat inicial={{ texto: conv.mensaje, createdAt: conv.createdAt }} entradas={conv.entradas} yo="USUARIO" nombreUsuario="Vos" />
              <div ref={fin} />

              {conv.estado === "ABIERTO" ? (
                <form onSubmit={enviar} className="space-y-2 border-t border-border pt-4">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="Escribí tu respuesta…"
                    className="w-full rounded-md border border-border bg-background p-2 text-sm"
                  />
                  {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={enviando || !texto.trim()} className="gap-2">
                      {enviando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />} Enviar
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground border-t border-border pt-4">
                  Esta conversación fue cerrada. Si necesitás algo más, <Link href="/contacto" className="text-primary hover:underline">escribinos de nuevo</Link>.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
