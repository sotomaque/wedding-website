import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Wedding game";
// Prisma needs the Node.js runtime (not edge).
export const runtime = "nodejs";

interface ImageProps {
  params: Promise<{ slug: string; token: string }>;
}

interface CardData {
  title: string;
  tagline: string;
  couple: string;
}

/** Preview card — same warm gradient + scrim + bottom text as the event card,
 * minus the hero photo (a game has none), so shared links look consistent. */
function Card({ title, tagline, couple }: CardData) {
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
          "linear-gradient(150deg, #f7f2ed 0%, #d8c4b3 55%, #8b6f47 100%)",
        fontFamily: "serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.80) 100%)",
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
          Wedding Game
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
          {title}
        </div>
        {tagline ? (
          <div
            style={{
              display: "flex",
              fontSize: 34,
              marginTop: 20,
              opacity: 0.95,
            }}
          >
            {tagline}
          </div>
        ) : null}
        <div style={{ fontSize: 28, marginTop: 28, opacity: 0.85 }}>
          {couple}
        </div>
      </div>
    </div>
  );
}

/** Truncate a description to something that fits the card on one or two lines. */
function toTagline(description: string | null): string {
  const base = description?.trim() || "Guess who's most likely to…";
  return base.length > 90 ? `${base.slice(0, 87).trimEnd()}…` : base;
}

/**
 * Rich link-preview card (iMessage / social) for the public game link. Wrapped
 * so it can never throw a 500 — a failed image means no preview at all, so we
 * always fall back to a plain branded card.
 */
export default async function OpengraphImage({ params }: ImageProps) {
  try {
    const { token } = await params;
    const game = await db.game.findFirst({
      where: { publicToken: token },
      select: {
        title: true,
        description: true,
        wedding: { select: { coupleName: true } },
      },
    });

    return new ImageResponse(
      <Card
        title={game?.title ?? "Wedding Game"}
        tagline={toTagline(game?.description ?? null)}
        couple={game?.wedding.coupleName ?? "Our Wedding"}
      />,
      { ...size },
    );
  } catch {
    return new ImageResponse(
      <Card
        title="Wedding Game"
        tagline="Guess who's most likely to…"
        couple=""
      />,
      { ...size },
    );
  }
}
