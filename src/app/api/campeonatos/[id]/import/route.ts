import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSailwaveCSV } from "@/lib/extractors/csv-parser";
import { parsePdfToResult } from "@/lib/extractors/pdf-extractor";
import { parseSailwaveXLSX, leerGridXLSX, armarParseResult, ColumnMapping } from "@/lib/extractors/xlsx-parser";
import { importCampeonatoResults } from "@/lib/extractors/import-service";
import { columnMappingSchema } from "@/lib/validators";

// Un campeonato grande (200+ regatistas x varias regatas) puede tardar más
// que el límite por defecto de las funciones serverless de Vercel.
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const campeonatoId = resolvedParams.id;

    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      select: { id: true }
    });

    if (!campeonato) {
      return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
    }

    const fileName = file.name.toLowerCase();
    let parseResult;

    // Si viene un "mapping" (el admin confirmó/corrigió las columnas en la
    // pantalla de vista previa), lo usamos tal cual en vez de volver a
    // adivinar -evita que una segunda detección automática, corriendo
    // sobre el mismo archivo, contradiga lo que el admin ya confirmó.
    const mappingRaw = formData.get("mapping") as string | null;

    if (fileName.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      parseResult = await parsePdfToResult(Buffer.from(arrayBuffer));
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (mappingRaw) {
        const mapping = columnMappingSchema.parse(JSON.parse(mappingRaw)) as ColumnMapping;
        const { header, rows } = leerGridXLSX(buffer);
        parseResult = armarParseResult(header, rows, mapping);
      } else {
        parseResult = parseSailwaveXLSX(buffer);
      }
    } else {
      const fileContent = await file.text();
      parseResult = parseSailwaveCSV(fileContent);
    }

    const result = await importCampeonatoResults(campeonatoId, parseResult);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[IMPORT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
