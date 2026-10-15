import { ImageResponse } from "next/og";
import { VELERO_TRAZADOS, VELERO_VIEWBOX } from "@/components/icons/sailing-boat-paths";

// Imagen de Open Graph por default -la que se ve al compartir el link del
// sitio (WhatsApp, redes) y la que usa cualquier página que no tenga la
// suya propia (aviso legal, etc.). Las rutas dinámicas importantes
// (campeonato, regatista, club) tienen cada una su propio
// opengraph-image.tsx con su nombre/clase/club de verdad -ver esas
// carpetas.
//
// El velero es el mismo de la barra de navegación (ver sailing-boat-paths).
// La tipografía es la que trae ImageResponse (Geist, solo en peso normal): el
// "negrita" del nombre se logra con un trazo del mismo color.
export const alt = "Orzando - Resultados, rankings y estadísticas de vela argentina";
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
          alignItems: "center",
          background: "linear-gradient(135deg, #0b1220 0%, #12264a 55%, #0c4a6e 100%)",
          color: "white",
          padding: "0 96px",
          position: "relative",
        }}
      >
        {/* Resplandor detrás del velero */}
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 55,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0) 70%)",
            display: "flex",
          }}
        />

        <svg width="330" height="378" viewBox={VELERO_VIEWBOX} fill="none" style={{ flexShrink: 0 }}>
          {VELERO_TRAZADOS.map((t) => (
            <path key={t.transform} d={t.d} fill="#60a5fa" transform={t.transform} />
          ))}
        </svg>

        <div style={{ display: "flex", flexDirection: "column", marginLeft: 72 }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              lineHeight: 1,
              letterSpacing: -5,
              WebkitTextStroke: "5px white",
            }}
          >
            Orzando
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#cbd5e1", marginTop: 28, lineHeight: 1.25 }}>
            Cada regata, cada regatista.
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#94a3b8", marginTop: 10 }}>
            Resultados, rankings y perfiles de vela argentina
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#60a5fa", marginTop: 44 }}>orzando.com.ar</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
