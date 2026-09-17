import { ImageResponse } from "next/og";

// Imagen de Open Graph por default -la que usa cualquier página que no
// tenga la suya propia (home, /aviso-legal, etc.). Las rutas dinámicas
// importantes (campeonato, regatista, club) tienen cada una su propio
// opengraph-image.tsx con su nombre/clase/club de verdad -ver esas
// carpetas.
export const alt = "FAY Stats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0c4a6e 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          FAY <span style={{ color: "#7dd3fc", marginLeft: 20 }}>Stats</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#cbd5e1", marginTop: 24 }}>
          Resultados, rankings y estadísticas de vela argentina
        </div>
      </div>
    ),
    { ...size }
  );
}
