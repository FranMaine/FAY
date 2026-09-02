"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadIcon, CheckCircleIcon, AlertCircleIcon, XIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

interface CsvUploadModalProps {
  campeonatoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CsvUploadModal({ campeonatoId, isOpen, onClose }: CsvUploadModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/campeonatos/${campeonatoId}/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al subir el archivo");
      }

      setSuccess(data.stats);
      router.refresh(); // Refrescar la página para ver los nuevos datos
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Importar Resultados (CSV / Excel / PDF)</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isUploading}>
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {!success ? (
            <>
              <p className="text-sm text-muted-foreground">
                Sube un archivo `.csv`, `.xlsx` o `.pdf` generado por Sailwave para importar los resultados automáticamente. Si el campeonato usa flotas divididas (Gold/Silver/Bronze), `.xlsx` es el formato más confiable.
              </p>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-background">
                <UploadIcon className="w-10 h-10 text-muted-foreground mb-4" />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90 cursor-pointer"
                  disabled={isUploading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold">¡Importación Exitosa!</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Regatistas procesados: {success.totalInscritos}</p>
                <p>Regatistas nuevos creados: {success.regatistasNuevos}</p>
                <p>Nuevas regatas añadidas: {success.regatasNuevas}</p>
                <p>Resultados importados: {success.resultadosInsertados}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            {success ? "Cerrar" : "Cancelar"}
          </Button>
          {!success && (
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Importar Datos"
              )}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
