import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { leerGridXLSX } from "@/lib/extractors/xlsx-parser";
import { detectarColumnas } from "@/lib/extractors/column-detector";
import { handleApiError } from "@/lib/api-error";

/**
 * Lee un .xlsx y devuelve una sugerencia de qué es cada columna + una
 * muestra de filas, SIN escribir nada en la base. El admin confirma o
 * corrige el mapeo en el modal antes de mandarlo a POST /import de verdad.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: "La vista previa solo está disponible para archivos .xlsx/.xls" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { header, rows } = leerGridXLSX(Buffer.from(arrayBuffer));
    const columnas = detectarColumnas(header, rows);

    return NextResponse.json({
      columnas,
      totalFilas: rows.length,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/campeonatos/[id]/import/preview');
  }
}
