"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, Loader2Icon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDeleteButtonProps {
  onConfirm: () => void | Promise<void>;
  className?: string;
  /** aria-label del botón de basura inicial. */
  label?: string;
  /** Texto que aparece al lado de los botones mientras se confirma. */
  confirmLabel?: string;
  disabled?: boolean;
}

const AUTO_CANCELAR_MS = 4000;

// Reemplaza al window.confirm() nativo para acciones destructivas: en vez
// de un diálogo del navegador (bloquea el hilo, se ve distinto en cada
// browser, no se puede estilar) el botón de basura se transforma in-place
// en "¿confirmar? / cancelar" -mismo espíritu de un botón de borrado de
// dos pasos, pero sin depender de ningún componente externo. Si no se
// confirma en unos segundos, vuelve solo al estado inicial (no queda
// "armado" para siempre esperando un click que capture otra persona
// después).
export function ConfirmDeleteButton({
  onConfirm,
  className,
  label = "Eliminar",
  confirmLabel = "¿Confirmar?",
  disabled,
}: ConfirmDeleteButtonProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function iniciar() {
    setConfirmando(true);
    timeoutRef.current = setTimeout(() => setConfirmando(false), AUTO_CANCELAR_MS);
  }

  function cancelar() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setConfirmando(false);
  }

  async function confirmar() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setBorrando(true);
    try {
      await onConfirm();
    } finally {
      setBorrando(false);
      setConfirmando(false);
    }
  }

  if (!confirmando) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        disabled={disabled}
        onClick={iniciar}
        className={cn("h-8 w-8 text-muted-foreground hover:text-red-500", className)}
      >
        <TrashIcon className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 fade-in-up" style={{ animationDuration: "150ms" }}>
      <span className="text-xs font-medium text-red-500 hidden sm:inline">{confirmLabel}</span>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        aria-label="Confirmar borrado"
        disabled={borrando}
        onClick={confirmar}
        className="h-8 w-8"
      >
        {borrando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Cancelar borrado"
        disabled={borrando}
        onClick={cancelar}
        className="h-8 w-8 text-muted-foreground"
      >
        <XIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
