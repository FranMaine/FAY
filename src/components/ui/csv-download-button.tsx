"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CsvDownloadButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}

function escaparCelda(valor: string | number): string {
  const s = String(valor);
  // Solo hace falta entrecomillar si el valor tiene algo que rompería el
  // CSV -una coma, una comilla, o un salto de línea. Envolver todo
  // siempre también sería válido, pero esto da un archivo más legible si
  // alguien lo abre en un editor de texto plano.
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Exportar a CSV una tabla que ya está en pantalla -pensado para
// reutilizarse en cualquier tabla del sitio (tabla de posiciones de un
// campeonato, historial de un regatista, ranking de un club) sin repetir
// la lógica de armado del archivo en cada lugar. Todo pasa por props ya
// calculadas (headers + rows) en vez de que el botón sepa de dónde salen
// los datos -así no le importa si viene de un campeonato o de un club.
export function CsvDownloadButton({ filename, headers, rows, label = "Descargar CSV" }: CsvDownloadButtonProps) {
  function descargar() {
    const lineas = [headers, ...rows].map((fila) => fila.map(escaparCelda).join(","));
    // "﻿" (BOM) al principio: sin esto, Excel en Windows -el programa
    // que más probablemente use alguien de un club para abrir esto- muestra
    // mal los acentos (interpreta el archivo como si no fuera UTF-8).
    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={descargar} className="gap-2">
      <DownloadIcon className="w-4 h-4" /> {label}
    </Button>
  );
}
