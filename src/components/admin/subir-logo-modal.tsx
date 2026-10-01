"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

interface SubirLogoModalProps {
  /** El archivo recién elegido en el <input type="file">; null = modal cerrado. */
  file: File | null;
  onClose: () => void;
  onConfirm: (quitarFondo: boolean) => Promise<void> | void;
  titulo?: string;
}

// Antes el logo se subía apenas se elegía el archivo, siempre con el fondo
// liso sacado automáticamente -bien para un escudo normal, pero un banner
// con su propio fondo de color (ej: "COPA DON GERARDO") terminaba con las
// letras arruinadas o, con el bug ya arreglado, sin fondo propio y
// dependiendo de encima de qué se muestre para tener contraste. Este paso
// intermedio (con vista previa) deja elegir a mano antes de subir.
export function SubirLogoModal({ file, onClose, onConfirm, titulo = "Subir logo" }: SubirLogoModalProps) {
  const [quitarFondo, setQuitarFondo] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // `quitarFondo` arranca en `true` por el useState de arriba -no hace
  // falta resetearlo al cambiar de archivo: cada archivo nuevo usa una
  // instancia nueva de este componente (ver `key` en los dos lugares que
  // lo usan), así que el estado ya nace limpio.
  //
  // previewUrl es una derivación pura de `file` (useMemo, no estado) -el
  // único efecto necesario es LIBERAR la URL del archivo anterior cuando
  // cambia o se desmonta, no asignar nada a React.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function confirmar() {
    setSubiendo(true);
    try {
      await onConfirm(quitarFondo);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <Modal isOpen={!!file} onClose={() => !subiendo && onClose()} className="w-full max-w-sm">
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">{titulo}</h2>

        {previewUrl && (
          <div
            className="flex items-center justify-center rounded-xl border border-border p-4"
            // Fondo a cuadros (como Photoshop/Figma) en vez de un color
            // fijo -con la vista previa es clave ver de entrada si la
            // imagen YA tiene transparencia, antes de decidir si hace
            // falta sacarle el fondo.
            style={{
              backgroundImage:
                "linear-gradient(45deg, #80808033 25%, transparent 25%), linear-gradient(-45deg, #80808033 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808033 75%), linear-gradient(-45deg, transparent 75%, #80808033 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview de un File local (blob: URL), next/image no sirve para esto */}
            <img src={previewUrl} alt="" className="max-h-40 max-w-full object-contain" />
          </div>
        )}

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={quitarFondo}
            onChange={(e) => setQuitarFondo(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className="font-medium text-foreground">Quitar fondo automáticamente</span>
            <span className="block text-muted-foreground">
              Para un escudo con fondo blanco o de un solo color. Desactivalo si la imagen es un banner con su
              propio fondo de color o ya tiene transparencia -sacarle el fondo puede arruinar el diseño.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={subiendo}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={subiendo}>
            {subiendo ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Subir"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
