"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertCircleIcon, XIcon, Loader2Icon } from "lucide-react";

interface Clase {
  id: string;
  nombre: string;
}

interface NuevoCampeonatoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  clases: Clase[];
}

const currentYear = new Date().getFullYear();

export function NuevoCampeonatoModal({ isOpen, onClose, onCreated, clases }: NuevoCampeonatoModalProps) {
  const [nombre, setNombre] = useState("");
  const [anio, setAnio] = useState(String(currentYear));
  const [claseId, setClaseId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setNombre("");
    setAnio(String(currentYear));
    setClaseId("");
    setFechaInicio("");
    setFechaFin("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (nombre.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres");
      return;
    }
    if (!claseId) {
      setError("Seleccioná una clase");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/campeonatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          anio: parseInt(anio, 10),
          claseId,
          fechaInicio: fechaInicio || undefined,
          fechaFin: fechaFin || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear el campeonato");
      }

      onCreated();
      resetAndClose();
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
          <h2 className="text-lg font-semibold">Nuevo Campeonato</h2>
          <Button variant="ghost" size="icon" onClick={resetAndClose} disabled={isSaving}>
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Campeonato Argentino de Optimist"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isSaving}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Año"
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              disabled={isSaving}
            />
            <Select
              label="Clase"
              placeholder="Seleccionar..."
              value={claseId}
              onChange={(e) => setClaseId(e.target.value)}
              options={clases.map((c) => ({ value: c.id, label: c.nombre }))}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              disabled={isSaving}
            />
            <Input
              label="Fecha de fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <Button variant="secondary" onClick={resetAndClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Campeonato"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
