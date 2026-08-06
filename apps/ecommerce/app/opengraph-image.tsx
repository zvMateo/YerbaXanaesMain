import { ImageResponse } from "next/og";

export const alt = "YerbaXanaes — Yerba Mate Premium Argentina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG dinámico (sin depender de public/og-image.jpg).
 * Next lo expone como /opengraph-image automáticamente.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0f7eb 0%, #ffffff 45%, #f5efe6 100%)",
          padding: "64px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "#4a7c3d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            Y
          </div>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#1c1917" }}>
            YerbaXanaes
          </span>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#1c1917",
            lineHeight: 1.15,
            maxWidth: 900,
            marginBottom: 24,
          }}
        >
          Yerba mate premium de Córdoba
        </div>
        <div style={{ fontSize: 28, color: "#57534e", maxWidth: 800 }}>
          Tradición argentina, fraccionada con cuidado · Envíos a todo el país
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 16,
            fontSize: 22,
            color: "#4a7c3d",
            fontWeight: 600,
          }}
        >
          <span>Villa del Rosario</span>
          <span>·</span>
          <span>yerbaxanaes.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
