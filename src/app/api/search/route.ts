import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const regatistas = await prisma.regatista.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { club: { nombre: { contains: q, mode: 'insensitive' } } }
        ]
      },
      include: {
        club: true,
      },
      take: 5,
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json(regatistas);
  } catch (error) {
    console.error("[SEARCH_ERROR]", error);
    return NextResponse.json({ error: "Error en búsqueda" }, { status: 500 });
  }
}
