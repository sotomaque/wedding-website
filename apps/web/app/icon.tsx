import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
      <span
        style={{
          fontSize: 16,
          fontFamily: "serif",
          color: "#7a5c48",
          lineHeight: 1,
        }}
      >
        H
      </span>
    </div>,
    { ...size },
  );
}
