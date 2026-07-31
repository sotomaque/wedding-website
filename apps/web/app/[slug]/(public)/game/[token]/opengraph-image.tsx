import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Wedding game";
// Prisma + remote image fetch need the Node.js runtime (not edge).
export const runtime = "nodejs";

interface ImageProps {
  params: Promise<{ slug: string; token: string }>;
}

/**
 * Best-effort load of an image URL as a base64 data URI Satori can embed. The
 * fetched image is transcoded with sharp to a baseline JPEG sized for the card
 * (Satori only decodes PNG/JPEG) and auto-oriented. Returns null on any problem
 * so the card still renders on its gradient. (Same approach as the event card.)
 */
async function loadImageDataUri(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.byteLength > 20_000_000) return null;
    const jpeg = await sharp(input, { failOn: "none" })
      .rotate()
      .resize(size.width, size.height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

interface CardData {
  title: string;
  tagline: string;
  couple: string;
  hero: string | null;
}

/** Preview card — same warm gradient + hero photo + scrim + bottom text as the
 * event card, so a shared game link looks consistent with a shared event link. */
function Card({ title, tagline, couple, hero }: CardData) {
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
 * Rich link-preview card (iMessage / social) for the public game link. Reuses
 * the wedding's hero cover photo (the same image atop the site + shared event
 * links) as the backdrop. Wrapped so it can never throw a 500 — a failed image
 * means no preview at all, so we always fall back to a branded card.
 */
export default async function OpengraphImage({ params }: ImageProps) {
  try {
    const { token } = await params;
    // Don't render a preview for a draft game — the page 404s it, and the OG
    // card would otherwise leak an unpublished game's title/description/photo.
    const game = await db.game.findFirst({
      where: { publicToken: token, status: { not: "draft" } },
      select: {
        title: true,
        description: true,
        weddingId: true,
        wedding: { select: { coupleName: true, brandImageUrl: true } },
      },
    });

    // Wedding cover image: first hero-section placement, else the brand image.
    let heroUrl: string | null = game?.wedding.brandImageUrl ?? null;
    if (game) {
      const heroPlacement = await db.photoPlacement.findFirst({
        where: { weddingId: game.weddingId, section: "hero" },
        orderBy: { displayOrder: "asc" },
        select: { photo: { select: { url: true } } },
      });
      if (heroPlacement?.photo.url) heroUrl = heroPlacement.photo.url;
    }

    return new ImageResponse(
      <Card
        title={game?.title ?? "Wedding Game"}
        tagline={toTagline(game?.description ?? null)}
        couple={game?.wedding.coupleName ?? "Our Wedding"}
        hero={await loadImageDataUri(heroUrl)}
      />,
      { ...size },
    );
  } catch {
    return new ImageResponse(
      <Card
        title="Wedding Game"
        tagline="Guess who's most likely to…"
        couple=""
        hero={null}
      />,
      { ...size },
    );
  }
}
