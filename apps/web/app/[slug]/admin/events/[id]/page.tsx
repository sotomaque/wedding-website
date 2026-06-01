import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Clock, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  type EventGuestRow,
  getEventRsvpBreakdown,
} from "@/lib/db/admin/event-rsvp-breakdown";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string) {
  const timeStr = value.includes("T") ? value.slice(11, 16) : value;
  const [hours, minutes] = timeStr.split(":");
  const hour = Number.parseInt(hours || "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function GuestList({
  slug,
  title,
  rows,
  emptyLabel,
}: {
  slug: string;
  title: string;
  rows: EventGuestRow[];
  emptyLabel: string;
}) {
  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground tabular-nums">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2 text-sm">
              <Link
                href={`/${slug}/admin/guests?edit=${row.id}`}
                className="hover:underline truncate"
              >
                {row.name}
              </Link>
              {row.selfRegistered && (
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">
                  Self-registered
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function EventRsvpDashboardPage({ params }: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { slug, id } = await params;
  const data = await getEventRsvpBreakdown(id);

  if (!data) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
        <Link
          href={`/${slug}/admin/events`}
          className="text-primary hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      </div>
    );
  }

  const {
    event,
    tally,
    responseRate,
    confirmed,
    pending,
    declined,
    selfRegistered,
  } = data;
  const isFull = event.capacity != null && tally.confirmed >= event.capacity;
  const capacityPct =
    event.capacity != null && event.capacity > 0
      ? Math.min(100, Math.round((tally.confirmed / event.capacity) * 100))
      : 0;

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <Link
        href={`/${slug}/admin/events`}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
          {event.eventDate && <span>{formatDate(event.eventDate)}</span>}
          {event.startTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(event.startTime)}
              {event.endTime && ` – ${formatTime(event.endTime)}`}
            </span>
          )}
          {event.locationName && <span>{event.locationName}</span>}
        </div>
      </div>

      {/* Capacity */}
      {event.capacity != null && (
        <div className="border rounded-lg bg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Capacity
            </h2>
            <span
              className={`text-sm font-medium tabular-nums ${isFull ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {tally.confirmed} / {event.capacity}
              {isFull ? " · Full" : ""}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${isFull ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-lg bg-card p-4">
          <p className="text-2xl font-bold tabular-nums">{responseRate}%</p>
          <p className="text-sm text-muted-foreground">responded</p>
        </div>
        <div className="border rounded-lg bg-card p-4">
          <p className="text-2xl font-bold tabular-nums text-green-600">
            {tally.confirmed}
          </p>
          <p className="text-sm text-muted-foreground">confirmed</p>
        </div>
        <div className="border rounded-lg bg-card p-4">
          <p className="text-2xl font-bold tabular-nums text-yellow-600">
            {tally.pending}
          </p>
          <p className="text-sm text-muted-foreground">pending</p>
        </div>
        <div className="border rounded-lg bg-card p-4">
          <p className="text-2xl font-bold tabular-nums text-red-600">
            {tally.declined}
          </p>
          <p className="text-sm text-muted-foreground">declined</p>
        </div>
      </div>

      {/* Self-registered callout */}
      {selfRegistered.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
            {selfRegistered.length} self-registered guest
            {selfRegistered.length === 1 ? "" : "s"}
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            These guests added themselves via the public RSVP link. Review and
            merge any duplicates.
          </p>
          <div className="flex flex-wrap gap-2">
            {selfRegistered.map((row) => (
              <Link
                key={row.id}
                href={`/${slug}/admin/guests?edit=${row.id}`}
                className="text-sm bg-white dark:bg-card border border-amber-200 rounded px-2 py-1 hover:border-amber-400"
              >
                {row.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Status lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GuestList
          slug={slug}
          title="Confirmed"
          rows={confirmed}
          emptyLabel="No confirmations yet."
        />
        <GuestList
          slug={slug}
          title="Pending"
          rows={pending}
          emptyLabel="Everyone has responded."
        />
        <GuestList
          slug={slug}
          title="Declined"
          rows={declined}
          emptyLabel="No declines."
        />
      </div>
    </div>
  );
}
