import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Wedding event RSVP";
// Prisma + remote fetch need the Node.js runtime (not edge).
export const runtime = "nodejs";

interface ImageProps {
  // Next passes route params as a Promise — must be awaited (see below).
  params: Promise<{ slug: string; token: string }>;
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
 * Best-effort load of the hero image as a base64 data URI that Satori can embed
 * directly (no fetch happens during image rendering). Returns null on any
 * problem — a slow/redirecting host, a non-200, an oversized file, or a format
 * Satori can't decode (it only handles PNG/JPEG) — so the card still renders.
 */
async function loadHeroDataUri(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g)$/i.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 5_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

interface CardData {
  name: string;
  couple: string;
  dateStr: string | null;
  location: string | null;
  hero: string | null;
}

/** The preview card. Self-contained: a gradient base, optional hero photo, a
 * scrim for legibility, and the event text overlay. */
function Card({ name, couple, dateStr, location, hero }: CardData) {
  return (
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
      {hero ? (
        // biome-ignore lint/performance/noImgElement: next/og only supports <img>
        <img
          src={hero}
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
    </div>
  );
}

/**
 * Rich link-preview card (iMessage / social) for a public event RSVP link.
 * Wrapped so it can never throw a 500 — a failed image means no preview at all
 * in Messages, so we always fall back to a plain branded card.
 */
export default async function OpengraphImage({ params }: ImageProps) {
  try {
    const { token } = await params;
    const event = await db.event.findUnique({
      where: { publicRsvpToken: token },
      include: {
        wedding: { select: { coupleName: true } },
      },
    });

    const data: CardData = {
      name: event?.name ?? "You're Invited",
      couple: event?.wedding.coupleName ?? "Our Wedding",
      dateStr: formatDate(event?.eventDate ?? null),
      location: event?.locationName ?? null,
      // Per-event photo only — the brand logo isn't used as a backdrop.
      hero: await loadHeroDataUri(event?.imageUrl ?? null),
    };

    return new ImageResponse(<Card {...data} />, { ...size });
  } catch {
    return new ImageResponse(
      <Card
        name="You're Invited"
        couple=""
        dateStr={null}
        location={null}
        hero={null}
      />,
      { ...size },
    );
  }
}
