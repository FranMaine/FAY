"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExcelDownloadButtonProps {
  filename: string;
  /** Nombre de la hoja dentro del archivo (máx. 31 caracteres, sin : \ / ? * [ ]) */
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}

// Antes esto exportaba un CSV, pero un CSV con comas no tiene un formato
// estándar: Excel decide cómo separar las columnas según la configuración
// regional de Windows, y en español (donde la coma es el separador
// decimal) usa punto y coma -sin eso, todo el archivo caía en la columna A.
// Un .xlsx es un formato binario que Excel lee de forma nativa, sin
// ambigüedad de separador ni de codificación (se terminan los acentos y
// la ñ mal mostrados), y de paso permite dejarlo más prolijo: columnas con
// ancho automático y un filtro en el encabezado.
//
// La librería (SheetJS, ya la usa la importación de campeonatos en
// src/lib/extractors/xlsx-parser.ts, ahí del lado del servidor) pesa lo
// suficiente como para no sumarla al bundle de estas páginas públicas -por
// eso el import es dinámico, y solo se descarga cuando el visitante
// efectivamente aprieta el botón.
function anchoColumna(header: string, rows: (string | number)[][], indice: number): { wch: number } {
  const valores = [header, ...rows.map((fila) => String(fila[indice] ?? ""))];
  const masLargo = Math.max(...valores.map((v) => v.length));
  // Entre 8 y 40 caracteres de ancho -por debajo, hasta el encabezado más
  // corto queda apretado; por arriba, una sola celda larga (ej: un nombre
  // de club completo) no debería estirar la hoja entera.
  return { wch: Math.min(40, Math.max(8, masLargo + 2)) };
}

export function ExcelDownloadButton({ filename, sheetName, headers, rows, label = "Descargar Excel" }: ExcelDownloadButtonProps) {
  const [generando, setGenerando] = useState(false);

  async function descargar() {
    setGenerando(true);
    try {
      const XLSX = await import("xlsx");
      const hoja = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      hoja["!cols"] = headers.map((h, i) => anchoColumna(h, rows, i));
      hoja["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, sheetName.slice(0, 31));
      XLSX.writeFile(libro, filename);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={descargar} disabled={generando} className="gap-2">
      {generando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />} {label}
    </Button>
  );
}
