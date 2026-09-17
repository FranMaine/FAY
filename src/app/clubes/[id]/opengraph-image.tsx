import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { CLUB_ALIASES } from "@/lib/club-aliases";

export const alt = "Club";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id }, select: { nombre: true, ciudad: true } });

  const nombre = club?.nombre || "Club";
  const alias = club ? CLUB_ALIASES[club.nombre] : undefined;

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
          FAY STATS · CLUB
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, marginTop: 24, lineHeight: 1.1, maxWidth: 1000 }}>
          {nombre}
        </div>
        {(alias || club?.ciudad) && (
          <div style={{ display: "flex", fontSize: 34, color: "#cbd5e1", marginTop: 20 }}>
            {[alias, club?.ciudad].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
