"use client";

import { useState } from "react";
import { FlagIcon, Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { mensajeDeError } from "@/lib/utils";

interface Props {
  regatistaId: string;
  nombre: string;
}

// Para fichas que ya están vinculadas a una cuenta: cualquiera puede avisar
// que esa vinculación no corresponde ("no soy yo", o "ese perfil es mío y lo
// tiene otra persona"). Usa el mismo formulario de contacto -así llega al
// mail de la web, queda guardado en el panel y tiene los mismos frenos
// anti-spam (ver /api/contacto)- con el asunto ya armado.
export function ReportarVinculacion({ regatistaId, nombre }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombreContacto, setNombreContacto] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trampa, setTrampa] = useState("");
  const [montadoEn] = useState(() => Date.now());
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreContacto,
          email,
          asunto: `Vinculación incorrecta: ${nombre}`.slice(0, 120),
          mensaje: `Perfil: ${window.location.origin}/regatistas/${regatistaId}\n\n${mensaje}`,
          sitioWeb: trampa,
          montadoEn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el aviso");
      setEnviado(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <FlagIcon className="w-4 h-4" aria-hidden="true" />
          ¿Este perfil está vinculado a la persona equivocada?
        </button>
      </div>

      <Modal
        isOpen={abierto}
        ariaLabel="Avisar de una vinculación incorrecta"
        onClose={() => !enviando && setAbierto(false)}
        className="w-full max-w-md"
      >
        <div className="p-6 space-y-5">
          {enviado ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2Icon className="w-12 h-12 text-primary" />
              <p className="font-medium text-lg">¡Gracias por avisarnos!</p>
              <p className="text-sm text-muted-foreground">Lo revisamos y te escribimos al email que dejaste.</p>
              <Button onClick={() => setAbierto(false)}>Cerrar</Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Avisar de una vinculación incorrecta</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Si el perfil de <strong className="text-foreground">{nombre}</strong> quedó vinculado a una cuenta que
                  no es de esa persona, contanos y lo revisamos.
                </p>
              </div>
              {/* Campo trampa anti-spam -ver src/lib/spam-guard.ts */}
              <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                <label htmlFor="rv-sitio">No completar este campo</label>
                <input id="rv-sitio" type="text" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
              </div>
              <Input id="rv-nombre" label="Tu nombre" value={nombreContacto} onChange={(e) => setNombreContacto(e.target.value)} required minLength={2} />
              <Input id="rv-email" label="Tu email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="space-y-1 w-full">
                <label htmlFor="rv-mensaje" className="text-sm font-medium text-muted">¿Qué pasa?</label>
                <textarea
                  id="rv-mensaje"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Ej: Este perfil es mío, pero lo tiene vinculado otra persona."
                  className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors hover:border-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setAbierto(false)} disabled={enviando}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando}>
                  {enviando ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enviar aviso
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
