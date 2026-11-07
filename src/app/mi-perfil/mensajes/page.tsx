"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, CircleIcon, Loader2Icon, LockIcon, MailIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, mensajeDeError } from "@/lib/utils";

interface Conversacion {
  id: string;
  token: string;
  asunto: string;
  mensaje: string;
  createdAt: string;
  estado: "ABIERTO" | "CERRADO";
  respuestaLeida: boolean;
  ultimaActividad: string;
  entradas: { autor: "ADMIN" | "USUARIO"; texto: string; createdAt: string }[];
}

// Conversaciones que la persona abrió por /contacto con su cuenta. Cada una
// abre su chat (/contacto/chat/<token>), donde puede seguir respondiendo
// hasta que el equipo la cierra.
export default function MisMensajesPage() {
  const [items, setItems] = useState<Conversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/mis-mensajes");
        if (!res.ok) throw new Error("No se pudieron cargar tus mensajes");
        setItems(await res.json());
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
          <p className="text-muted-foreground">Tus conversaciones con el equipo de Orzando.</p>
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
          <div className="space-y-3">
            {items.map((c) => {
              const ultima = c.entradas[0];
              return (
                <Link key={c.id} href={`/contacto/chat/${c.token}`} className="block">
                  <Card className={cn("bg-surface border-border hover:bg-surface-hover transition-colors", !c.respuestaLeida && "border-primary/50")}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          {!c.respuestaLeida && <CircleIcon className="w-2 h-2 fill-primary text-primary shrink-0" />}
                          <p className="font-semibold truncate">{c.asunto}</p>
                          {c.estado === "CERRADO" && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground shrink-0"><LockIcon className="w-3 h-3" /> Cerrada</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {ultima ? `${ultima.autor === "ADMIN" ? "Orzando" : "Vos"}: ${ultima.texto}` : `Vos: ${c.mensaje}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(c.ultimaActividad).toLocaleString("es-AR")}</p>
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
