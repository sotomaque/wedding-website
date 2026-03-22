import { Suspense } from "react";
import { db } from "@/lib/db";
import { EventRSVPForm } from "./event-rsvp-form";

interface EventRSVPPageProps {
  searchParams: Promise<{
    code?: string;
    event?: string;
  }>;
}

async function verifyEventInvite(code: string, eventId: string) {
  try {
    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase().trim();

    // Find guest with this invite code
    const guest = await db.guest.findFirst({
      where: {
        inviteCode: normalizedCode,
        isPlusOne: false, // Only match primary guests
      },
    });

    if (!guest) {
      return { error: "Invalid invite code" };
    }

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check if guest is invited to this event
    const invite = await db.guestEventInvite.findFirst({
      where: {
        guestId: guest.id,
        eventId,
      },
    });

    if (!invite) {
      return { error: "You are not invited to this event" };
    }

    // Format event date if present
    const eventDateStr = event.eventDate
      ? event.eventDate instanceof Date
        ? event.eventDate.toISOString().split("T")[0]
        : String(event.eventDate)
      : null;

    return {
      success: true,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        inviteCode: guest.inviteCode ?? "",
      },
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: eventDateStr,
        startTime: event.startTime
          ? event.startTime instanceof Date
            ? event.startTime.toISOString()
            : String(event.startTime)
          : null,
        endTime: event.endTime
          ? event.endTime instanceof Date
            ? event.endTime.toISOString()
            : String(event.endTime)
          : null,
        locationName: event.locationName,
        locationAddress: event.locationAddress,
      },
      invite: {
        id: invite.id,
        rsvpStatus: invite.rsvpStatus as "pending" | "yes" | "no",
      },
    };
  } catch (error) {
    console.error("Error verifying event invite:", error);
    return { error: "An error occurred" };
  }
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Unable to Access Event
        </h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <p className="text-sm text-gray-500">
          If you believe this is an error, please contact the event organizers.
        </p>
      </div>
    </div>
  );
}

function MissingParamsDisplay() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Missing Information
        </h1>
        <p className="text-gray-600 mb-6">
          This page requires an invite code and event ID. Please use the link
          provided in your invitation email.
        </p>
      </div>
    </div>
  );
}

async function EventRSVPContent({
  searchParams,
}: {
  searchParams: EventRSVPPageProps["searchParams"];
}) {
  const params = await searchParams;
  const code = params.code;
  const eventId = params.event;

  // Check if we have the required parameters
  if (!code || !eventId) {
    return <MissingParamsDisplay />;
  }

  // Verify the invite
  const result = await verifyEventInvite(code, eventId);

  if ("error" in result) {
    return <ErrorDisplay message={result.error as string} />;
  }

  // Extract properties with proper types
  const { guest, event, invite } = result;

  // Show the RSVP form
  return (
    <EventRSVPForm
      guest={guest}
      event={{
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.eventDate ?? null,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        locationAddress: event.locationAddress,
      }}
      invite={invite}
    />
  );
}

export default async function EventRSVPPage({
  searchParams,
}: EventRSVPPageProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EventRSVPContent searchParams={searchParams} />
    </Suspense>
  );
}
