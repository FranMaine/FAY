import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSailwaveCSV } from "@/lib/extractors/csv-parser";
import { parsePdfToResult } from "@/lib/extractors/pdf-extractor";
import { importCampeonatoResults } from "@/lib/extractors/import-service";

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

    let parseResult;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      parseResult = await parsePdfToResult(Buffer.from(arrayBuffer));
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
