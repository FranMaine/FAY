"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircleIcon, XIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { mensajeDeError } from "@/lib/utils";

interface ClubRef {
  id: string;
  nombre: string;
}

interface RegatistaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  regatista?: { id: string; nombre: string; club: ClubRef | null; otrosClubes?: ClubRef[]; pais: string | null } | null;
}

export function RegatistaModal({ isOpen, onClose, onSaved, regatista }: RegatistaModalProps) {
  const [nombre, setNombre] = useState("");
  const [club, setClub] = useState("");
  const [pais, setPais] = useState("Argentina");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Doble club (ver "otrosClubes" en el schema): solo editable en un
  // regatista ya existente -antes solo se podía asignar desde la
  // resolución de un club "combo" en /admin/clubes, sin forma de verlo ni
  // tocarlo a mano después.
  const [otrosClubes, setOtrosClubes] = useState<ClubRef[]>([]);
  const [nuevoClub, setNuevoClub] = useState("");
  const [guardandoClubes, setGuardandoClubes] = useState(false);
  const [errorClubes, setErrorClubes] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Sincroniza el formulario con la ficha a editar (o lo limpia para
      // "Nuevo Regatista") cada vez que se abre el modal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre(regatista?.nombre || "");
      setClub(regatista?.club?.nombre || "");
      setPais(regatista?.pais || "Argentina");
      setOtrosClubes(regatista?.otrosClubes || []);
      setNuevoClub("");
      setError(null);
      setErrorClubes(null);
    }
  }, [isOpen, regatista]);

  async function guardarOtrosClubes(nuevaLista: ClubRef[]) {
    if (!regatista?.club) return; // no tiene sentido un club secundario sin uno principal
    setGuardandoClubes(true);
    setErrorClubes(null);
    try {
      const res = await fetch(`/api/admin/regatistas/${regatista.id}/club`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubIds: [regatista.club.id, ...nuevaLista.map((c) => c.id)] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setOtrosClubes(nuevaLista);
      onSaved();
    } catch (err) {
      setErrorClubes(mensajeDeError(err));
    } finally {
      setGuardandoClubes(false);
    }
  }

  async function agregarClub() {
    const nombreClub = nuevoClub.trim();
    if (nombreClub.length < 2) return;
    if (otrosClubes.some((c) => c.nombre.toLowerCase() === nombreClub.toLowerCase())) {
      setErrorClubes("Ya está agregado");
      return;
    }
    setGuardandoClubes(true);
    setErrorClubes(null);
    try {
      const res = await fetch("/api/admin/clubes/resolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreClub }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo agregar el club");
      await guardarOtrosClubes([...otrosClubes, { id: data.id, nombre: data.nombre }]);
      setNuevoClub("");
    } catch (err) {
      setErrorClubes(mensajeDeError(err));
    } finally {
      setGuardandoClubes(false);
    }
  }

  const handleSubmit = async () => {
    if (nombre.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const url = regatista ? `/api/regatistas/${regatista.id}` : "/api/regatistas";
      const method = regatista ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), club: club.trim(), pais: pais.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el regatista");

      onSaved();
      onClose();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{regatista ? "Editar Regatista" : "Nuevo Regatista"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Juan Pérez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isSaving}
          />
          <Input
            label="Club"
            placeholder="Ej: Yacht Club Argentino"
            value={club}
            onChange={(e) => setClub(e.target.value)}
            disabled={isSaving}
          />
          <Input
            label="País"
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            disabled={isSaving}
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {regatista?.club && (
          <div className="px-6 pb-6 -mt-2 space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-muted-foreground">
              Otros clubes (compite por dos clubes a la vez)
            </p>
            {otrosClubes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {otrosClubes.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 text-xs bg-background border border-border rounded-full pl-3 pr-1.5 py-1">
                    {c.nombre}
                    <button
                      type="button"
                      aria-label={`Quitar ${c.nombre}`}
                      disabled={guardandoClubes}
                      onClick={() => guardarOtrosClubes(otrosClubes.filter((x) => x.id !== c.id))}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={nuevoClub}
                onChange={(e) => setNuevoClub(e.target.value)}
                placeholder="Nombre exacto del club a agregar"
                disabled={guardandoClubes}
                className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-1.5"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarClub(); } }}
              />
              <Button type="button" size="sm" variant="outline" disabled={guardandoClubes || nuevoClub.trim().length < 2} onClick={agregarClub} className="gap-1">
                {guardandoClubes ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlusIcon className="w-3.5 h-3.5" />}
                Agregar
              </Button>
            </div>
            {errorClubes && <p className="text-xs text-red-500">{errorClubes}</p>}
          </div>
        )}

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
    </Modal>
  );
}
