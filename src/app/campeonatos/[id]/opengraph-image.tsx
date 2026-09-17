import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const alt = "Campeonato";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campeonato = await prisma.campeonato.findUnique({
    where: { id },
    select: { nombre: true, anio: true, clase: { select: { nombre: true } }, sede: { select: { nombre: true } } },
  });

  const titulo = campeonato ? `${campeonato.nombre} ${campeonato.anio}` : "Campeonato";
  const subtitulo = campeonato
    ? `${campeonato.clase.nombre}${campeonato.sede ? ` · ${campeonato.sede.nombre}` : ""}`
    : "FAY Stats";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#7dd3fc", fontWeight: 700, letterSpacing: 2 }}>
          FAY STATS
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, marginTop: 24, lineHeight: 1.1, maxWidth: 1000 }}>
          {titulo}
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#cbd5e1", marginTop: 20 }}>
          {subtitulo}
        </div>
      </div>
    ),
    { ...size }
  );
}
