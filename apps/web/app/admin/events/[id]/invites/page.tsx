import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { InvitesClient } from "./invites-client";

export const dynamic = "force-dynamic";

interface SearchParams {
  side?: "bride" | "groom";
  family?: "true" | "false";
  bridalParty?: string; // Comma-separated: "groomsman,best_man" etc.
  weddingRsvp?: string; // Comma-separated: "yes,pending" etc.
  eventInvited?: "true" | "false";
  emailSent?: "true" | "false";
  eventRsvp?: string; // Comma-separated: "yes,pending" etc.
  page?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

type BridalPartyRole =
  | "groomsman"
  | "best_man"
  | "bridesmaid"
  | "maid_of_honor"
  | null;

interface GuestData {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  inviteCode: string;
  mainRsvpStatus: "pending" | "yes" | "no";
  side: "bride" | "groom" | "both" | null;
  list: "a" | "b" | "c";
  family: boolean;
  bridalPartyRole: BridalPartyRole;
  isInvited: boolean;
  eventRsvpStatus: "pending" | "yes" | "no" | null;
  emailSent: boolean;
  emailSentAt: string | null;
  emailResendCount: number;
}

async function getEventWithInvites(eventId: string, filters: SearchParams) {
  // Verify event exists and is not a default event
  const event = await db
    .selectFrom("events")
    .selectAll()
    .where("id", "=", eventId)
    .executeTakeFirst();

  if (!event) {
    return null;
  }

  if (event.is_default) {
    return {
      event: {
        id: event.id,
        name: event.name,
        eventDate: event.event_date
          ? event.event_date instanceof Date
            ? (event.event_date.toISOString().split("T")[0] ?? null)
            : String(event.event_date)
          : null,
        startTime: event.start_time,
        locationName: event.location_name,
      },
      isDefault: true,
      guests: [] as GuestData[],
      totalCount: 0,
    };
  }

  // Get all guests with their invite status for this event
  const guests = await db
    .selectFrom("guests")
    .leftJoin("guest_event_invites", (join) =>
      join
        .onRef("guests.id", "=", "guest_event_invites.guest_id")
        .on("guest_event_invites.event_id", "=", eventId),
    )
    .select([
      "guests.id",
      "guests.first_name",
      "guests.last_name",
      "guests.email",
      "guests.invite_code",
      "guests.rsvp_status as main_rsvp_status",
      "guests.side",
      "guests.list",
      "guests.family",
      "guests.bridal_party_role",
      "guest_event_invites.id as invite_id",
      "guest_event_invites.rsvp_status as event_rsvp_status",
      "guest_event_invites.email_sent",
      "guest_event_invites.email_sent_at",
      "guest_event_invites.email_resend_count",
    ])
    .where("guests.is_plus_one", "=", false) // Only show primary guests
    .orderBy("guests.first_name", "asc")
    .execute();

  // Transform the data
  const allGuests: GuestData[] = guests.map((guest) => ({
    id: guest.id,
    firstName: guest.first_name,
    lastName: guest.last_name,
    email: guest.email,
    inviteCode: guest.invite_code,
    mainRsvpStatus: guest.main_rsvp_status as "pending" | "yes" | "no",
    side: guest.side as "bride" | "groom" | "both" | null,
    list: guest.list as "a" | "b" | "c",
    family: guest.family ?? false,
    bridalPartyRole: guest.bridal_party_role as BridalPartyRole,
    isInvited: guest.invite_id !== null,
    eventRsvpStatus: (guest.event_rsvp_status || null) as
      | "pending"
      | "yes"
      | "no"
      | null,
    emailSent: guest.email_sent || false,
    emailSentAt: guest.email_sent_at
      ? guest.email_sent_at instanceof Date
        ? guest.email_sent_at.toISOString()
        : String(guest.email_sent_at)
      : null,
    emailResendCount: guest.email_resend_count || 0,
  }));

  // Apply filters
  let filteredGuests = allGuests;

  if (filters.side) {
    filteredGuests = filteredGuests.filter((g) => g.side === filters.side);
  }

  if (filters.family === "true") {
    filteredGuests = filteredGuests.filter((g) => g.family);
  } else if (filters.family === "false") {
    filteredGuests = filteredGuests.filter((g) => !g.family);
  }

  if (filters.bridalParty) {
    const bridalPartyValues = filters.bridalParty.split(",");
    if (bridalPartyValues.includes("any")) {
      filteredGuests = filteredGuests.filter((g) => g.bridalPartyRole !== null);
    } else {
      filteredGuests = filteredGuests.filter(
        (g) =>
          g.bridalPartyRole && bridalPartyValues.includes(g.bridalPartyRole),
      );
    }
  }

  if (filters.weddingRsvp) {
    const weddingRsvpValues = filters.weddingRsvp.split(",");
    filteredGuests = filteredGuests.filter((g) =>
      weddingRsvpValues.includes(g.mainRsvpStatus),
    );
  }

  if (filters.eventInvited === "true") {
    filteredGuests = filteredGuests.filter((g) => g.isInvited);
  } else if (filters.eventInvited === "false") {
    filteredGuests = filteredGuests.filter((g) => !g.isInvited);
  }

  if (filters.emailSent === "true") {
    filteredGuests = filteredGuests.filter((g) => g.emailSent);
  } else if (filters.emailSent === "false") {
    filteredGuests = filteredGuests.filter((g) => g.isInvited && !g.emailSent);
  }

  if (filters.eventRsvp) {
    const eventRsvpValues = filters.eventRsvp.split(",");
    filteredGuests = filteredGuests.filter(
      (g) => g.eventRsvpStatus && eventRsvpValues.includes(g.eventRsvpStatus),
    );
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      eventDate: event.event_date
        ? event.event_date instanceof Date
          ? (event.event_date.toISOString().split("T")[0] ?? null)
          : String(event.event_date)
        : null,
      startTime: event.start_time,
      locationName: event.location_name,
    },
    isDefault: false,
    guests: filteredGuests,
    totalCount: allGuests.length,
  };
}

function LoadingSkeleton() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48 mb-8" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

async function InvitesContent({
  eventId,
  searchParams,
}: {
  eventId: string;
  searchParams: SearchParams;
}) {
  const data = await getEventWithInvites(eventId, searchParams);

  if (!data) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The event you're looking for doesn't exist.
          </p>
          <Link
            href="/admin/events"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (data.isDefault) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Cannot Manage Invites</h1>
          <p className="text-muted-foreground mb-4">
            This is a default event where all guests are automatically invited.
            You cannot manually manage invites for default events.
          </p>
          <Link
            href="/admin/events"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <InvitesClient
      event={data.event}
      initialGuests={data.guests}
      totalCount={data.totalCount}
    />
  );
}

export default async function EventInvitesPage({
  params,
  searchParams,
}: PageProps) {
  const user = await currentUser();
  const { id: eventId } = await params;
  const filters = await searchParams;

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InvitesContent eventId={eventId} searchParams={filters} />
    </Suspense>
  );
}
