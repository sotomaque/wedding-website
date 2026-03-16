import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #f7f2ed 0%, #e9ddd4 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 64,
            fontFamily: "serif",
            color: "#7a5c48",
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          H & E
        </span>
        <span
          style={{
            fontSize: 14,
            fontFamily: "serif",
            color: "#a8896f",
            letterSpacing: 4,
          }}
        >
          2026
        </span>
      </div>
    </div>,
    { ...size },
  );
}
