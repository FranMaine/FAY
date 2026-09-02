"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircleIcon, XIcon, Loader2Icon } from "lucide-react";

interface RegatistaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  regatista?: { id: string; nombre: string; club: { nombre: string } | null; pais: string | null } | null;
}

export function RegatistaModal({ isOpen, onClose, onSaved, regatista }: RegatistaModalProps) {
  const [nombre, setNombre] = useState("");
  const [club, setClub] = useState("");
  const [pais, setPais] = useState("Argentina");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNombre(regatista?.nombre || "");
      setClub(regatista?.club?.nombre || "");
      setPais(regatista?.pais || "Argentina");
      setError(null);
    }
  }, [isOpen, regatista]);

  if (!isOpen) return null;

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
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
      </div>
    </div>
  );
}
