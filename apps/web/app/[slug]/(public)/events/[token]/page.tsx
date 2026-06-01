import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { PublicEventRsvp } from "./public-event-rsvp";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

/**
 * Load the event + its wedding by public token. Cached so generateMetadata and
 * the page body share a single query per request.
 */
const getPublicEvent = cache(async (token: string) => {
  const event = await db.event.findUnique({
    where: { publicRsvpToken: token },
    include: {
      wedding: {
        select: {
          coupleName: true,
          brandImageUrl: true,
          brandImageAlt: true,
        },
      },
    },
  });
  return event;
});

function toDateString(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date
    ? (value.toISOString().split("T")[0] ?? null)
    : String(value);
}

function toTimeString(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(11, 16)
    : String(value);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const event = await getPublicEvent(token);
  if (!event) {
    return { title: "RSVP" };
  }

  const couple = event.wedding.coupleName;
  const dateStr = toDateString(event.eventDate);
  const prettyDate = dateStr
    ? new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const title = `RSVP · ${event.name}`;
  const descriptionParts = [
    `You're invited to ${event.name}`,
    prettyDate,
    event.locationName,
  ].filter(Boolean);
  const description = `${descriptionParts.join(" · ")} — RSVP for ${couple}'s wedding.`;

  return {
    title,
    description,
    openGraph: {
      title: `${event.name} · ${couple}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} · ${couple}`,
      description,
    },
  };
}

export default async function PublicEventRsvpPage({ params }: PageProps) {
  const { token } = await params;
  const event = await getPublicEvent(token);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Link not found
          </h1>
          <p className="text-gray-600">
            This RSVP link is no longer valid. Please check with the couple for
            an updated link.
          </p>
        </div>
      </div>
    );
  }

  const confirmedCount = await db.guestEventInvite.count({
    where: { eventId: event.id, rsvpStatus: "yes" },
  });
  const isFull = event.capacity != null && confirmedCount >= event.capacity;

  return (
    <PublicEventRsvp
      token={token}
      coupleName={event.wedding.coupleName}
      event={{
        name: event.name,
        description: event.description,
        eventDate: toDateString(event.eventDate),
        startTime: toTimeString(event.startTime),
        endTime: toTimeString(event.endTime),
        locationName: event.locationName,
        locationAddress: event.locationAddress,
      }}
      isFull={isFull}
    />
  );
}
