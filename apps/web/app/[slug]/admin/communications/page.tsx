import { currentUser } from "@clerk/nextjs/server";
import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingEmailLog } from "@/lib/db/admin/email-log-list";
import { getWeddingId } from "@/lib/db/wedding-context";
import { ThankYouPhotosCard } from "./thank-you-photos-card";
import { TwoWeekReminderCard } from "./two-week-reminder-card";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}

// Friendly labels for logged email types; unknown values are title-cased.
const TYPE_LABELS: Record<string, string> = {
  wedding_invitation: "Wedding Invitation",
  event_invitation: "Event Invitation",
  activities_invitation: "Activities Invitation",
  calendar_invite: "Calendar Invite",
  rsvp_reminder: "RSVP Reminder",
  rsvp_confirmation: "RSVP Confirmation",
  rsvp_notification: "RSVP Notification",
  event_rsvp_notification: "Event RSVP Notification",
  hotel_interest_notification: "Hotel Interest",
  registry_claim_notification: "Registry Claim",
  gift_thank_you: "Gift Thank-You",
  admin_summary: "Admin Summary",
  welcome: "Welcome",
  guest_export: "Guest Export",
  thank_you_photos: "Thank You + Photos",
  thank_you_photos_preview: "Thank You + Photos (Preview)",
  two_week_reminder: "Two-Week Reminder",
  two_week_reminder_preview: "Two-Week Reminder (Preview)",
  custom: "Custom Email",
};

function typeLabel(type: string): string {
  return (
    TYPE_LABELS[type] ??
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default async function CommunicationsPage({
  params,
  searchParams,
}: PageProps) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const { type } = await searchParams;
  const weddingId = await getWeddingId();
  const { entries, typeCounts, total } = await getWeddingEmailLog(weddingId, {
    type,
  });

  // Confirmed guests who can receive the two-week reminder (RSVP'd yes + email).
  const confirmedCount = await db.guest.count({
    where: { weddingId, rsvpStatus: "yes", email: { not: null } },
  });

  // Events for the reminder audience toggle (e.g. Ceremony vs Reception). The
  // card resolves per-event confirmed counts on demand as the scope changes.
  const events = await db.event.findMany({
    where: { weddingId },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-muted-foreground">
          Every email sent for this wedding — {total.toLocaleString()} total.
        </p>
      </div>

      <TwoWeekReminderCard confirmedCount={confirmedCount} events={events} />

      <ThankYouPhotosCard confirmedCount={confirmedCount} />

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={`/${slug}/admin/communications`}
          className={`rounded-full px-3 py-1 text-sm border ${
            !type
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card hover:border-primary"
          }`}
        >
          All
        </Link>
        {typeCounts.map((tc) => (
          <Link
            key={tc.type}
            href={`/${slug}/admin/communications?type=${tc.type}`}
            className={`rounded-full px-3 py-1 text-sm border ${
              type === tc.type
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:border-primary"
            }`}
          >
            {typeLabel(tc.type)}{" "}
            <span className="opacity-70 tabular-nums">{tc.count}</span>
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          No emails recorded yet.
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {typeLabel(e.type)}
                  </span>
                  {e.status === "failed" && (
                    <span className="text-xs bg-destructive/10 text-destructive rounded px-1.5 py-0.5">
                      Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {e.subject || "(no subject)"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm truncate max-w-[16rem]">
                  {e.guest ? (
                    <Link
                      href={`/${slug}/admin/guests?edit=${e.guest.id}`}
                      className="hover:underline"
                    >
                      {`${e.guest.firstName} ${e.guest.lastName ?? ""}`.trim()}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {e.recipientEmail}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(e.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
