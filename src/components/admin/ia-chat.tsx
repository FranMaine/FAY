"use client";

import { useEffect, useRef, useState } from "react";
import { BinocularsIcon, Loader2Icon, SendIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, mensajeDeError } from "@/lib/utils";

interface Mensaje {
  rol: "usuario" | "ia";
  texto: string;
}

// Frases mientras Vigía consulta: van rotando con cada pregunta.
const ESPERAS = ["Oteando el horizonte…", "Revisando las cartas de navegación…", "Sondeando la base de datos…", "Mirando desde el mástil…"];

const SUGERENCIAS = [
  "¿Cuántos regatistas y campeonatos hay cargados?",
  "¿Qué clubes tienen más podios?",
  "¿Cuántos apellidos sueltos quedan por revisar?",
  "Mostrame el ranking de 420 de 2026",
];

// Vigía, el asistente para el admin: botón anclado al borde derecho que abre un panel
// lateral de chat. Solo consulta datos (el servidor le da herramientas de
// lectura, ver /api/admin/ia/chat): no puede modificar nada.
export function IaChat() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [espera, setEspera] = useState(ESPERAS[0]);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, enviando]);

  useEffect(() => {
    if (!abierto) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  async function enviar(pregunta: string) {
    const limpio = pregunta.trim();
    if (!limpio || enviando) return;
    const nuevos: Mensaje[] = [...mensajes, { rol: "usuario", texto: limpio }];
    setMensajes(nuevos);
    setTexto("");
    setError(null);
    setEnviando(true);
    setEspera(ESPERAS[nuevos.length % ESPERAS.length]);
    try {
      const res = await fetch("/api/admin/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // El servidor solo acepta los últimos 12 mensajes.
        body: JSON.stringify({ mensajes: nuevos.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo consultar a la IA");
      setMensajes([...nuevos, { rol: "ia", texto: data.respuesta }]);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Pestaña anclada al borde derecho, siempre a la vista. */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir a Vigía, el asistente de IA"
        aria-expanded={abierto}
        className={cn(
          "fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-border bg-primary-solid px-3 py-4 text-white shadow-lg transition-[transform,opacity] duration-200 ease-out-strong hover:pr-4 active:scale-95",
          abierto && "pointer-events-none opacity-0"
        )}
      >
        <BinocularsIcon className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-semibold [writing-mode:vertical-rl]">Vigía</span>
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ease-out-strong motion-reduce:transition-none sm:bg-transparent",
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setAbierto(false)}
        aria-hidden={!abierto}
      />
      <aside
        role="dialog"
        aria-label="Vigía, asistente de IA"
        aria-hidden={!abierto}
        inert={!abierto}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-dvh w-full flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-[250ms] ease-out-strong motion-reduce:transition-none sm:w-[420px]",
          abierto ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <BinocularsIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-bold">Vigía</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar a Vigía" onClick={() => setAbierto(false)}>
            <XIcon className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
          {mensajes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              ¡Hola! Soy Vigía. Desde acá arriba del mástil veo todos los datos del sitio: regatistas, campeonatos, rankings y clubes. Preguntame lo que necesites. Yo solo miro y aviso, no toco nada.
            </p>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={cn("flex", m.rol === "usuario" ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                  m.rol === "usuario" ? "bg-primary-solid text-white" : "border border-border bg-background/60"
                )}
              >
                {m.texto}
              </p>
            </div>
          ))}
          {enviando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> {espera}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </p>
          )}
          <div ref={finRef} />
        </div>

        <div className="flex gap-2 overflow-x-auto border-t border-border px-3 pt-3" role="group" aria-label="Preguntas frecuentes">
          {SUGERENCIAS.map((sug) => (
            <button
              key={sug}
              type="button"
              disabled={enviando}
              onClick={() => enviar(sug)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-background/60 disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="flex items-center gap-2 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        >
          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            placeholder="Escribí tu consulta"
            aria-label="Tu consulta"
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="icon" aria-label="Enviar" disabled={enviando || !texto.trim()}>
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </aside>
    </>
  );
}
