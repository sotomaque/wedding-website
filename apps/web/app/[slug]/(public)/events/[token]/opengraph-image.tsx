import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Wedding event RSVP";

interface ImageProps {
  params: { slug: string; token: string };
}

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  const str =
    value instanceof Date
      ? (value.toISOString().split("T")[0] ?? "")
      : String(value);
  if (!str) return null;
  const d = new Date(`${str}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Rich link-preview card (iMessage / social) for a public event RSVP link.
 * Renders the event name, date, and location over the wedding's brand image
 * with a scrim, falling back to a warm gradient when there's no image.
 */
export default async function OpengraphImage({ params }: ImageProps) {
  const event = await db.event.findUnique({
    where: { publicRsvpToken: params.token },
    include: {
      wedding: { select: { coupleName: true, brandImageUrl: true } },
    },
  });

  const couple = event?.wedding.coupleName ?? "Our Wedding";
  const name = event?.name ?? "You're Invited";
  const dateStr = formatDate(event?.eventDate ?? null);
  const location = event?.locationName ?? null;
  const bgImage = event?.wedding.brandImageUrl ?? null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        position: "relative",
        background:
          "linear-gradient(150deg, #f7f2ed 0%, #d8c4b3 60%, #a9876c 100%)",
        fontFamily: "serif",
      }}
    >
      {bgImage ? (
        // biome-ignore lint/performance/noImgElement: next/og only supports <img>
        <img
          src={bgImage}
          alt=""
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}

      {/* Scrim for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          padding: "64px 72px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.9,
            marginBottom: 12,
          }}
        >
          You're invited
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
          {name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            marginTop: 20,
            opacity: 0.95,
          }}
        >
          {[dateStr, location].filter(Boolean).join("  ·  ")}
        </div>
        <div style={{ fontSize: 28, marginTop: 28, opacity: 0.85 }}>
          {couple}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
