"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircle2Icon, Loader2Icon, MailIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mensajeDeError } from "@/lib/utils";

export default function ContactoPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trampa, setTrampa] = useState("");
  const [montadoEn] = useState(() => Date.now());

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, asunto, mensaje, sitioWeb: trampa, montadoEn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje");
      setEnviado(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10 flex items-start justify-center">
      <div className="w-full max-w-lg mt-6 space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Volver al inicio
          </Button>
        </Link>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MailIcon className="w-6 h-6 text-primary" /> Contacto
            </CardTitle>
            <CardDescription>
              ¿Encontraste un error en tus datos o en un resultado? ¿Tenés una consulta? Escribinos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enviado ? (
              <div className="flex flex-col items-center text-center gap-3 py-8">
                <CheckCircle2Icon className="w-12 h-12 text-primary" />
                <p className="font-medium text-lg">¡Mensaje enviado!</p>
                <p className="text-muted-foreground text-sm">Te vamos a responder al email que dejaste.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Campo trampa anti-spam -ver src/lib/spam-guard.ts */}
                <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="sitioWeb">No completar este campo</label>
                  <input
                    id="sitioWeb"
                    name="sitioWeb"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={trampa}
                    onChange={(e) => setTrampa(e.target.value)}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    minLength={2}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="Asunto"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  required
                  minLength={3}
                />
                <div className="space-y-1 w-full">
                  <label htmlFor="mensaje" className="text-sm font-medium text-muted">Mensaje</label>
                  <textarea
                    id="mensaje"
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    required
                    minLength={10}
                    rows={5}
                    className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors hover:border-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" disabled={enviando} className="w-full gap-2">
                  {enviando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                  Enviar mensaje
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
