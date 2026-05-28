import { Suspense } from "react";
import {
  getDetailsContent,
  getRsvpContent,
  getWeddingSettings,
} from "@/lib/db/wedding-content-data";
import { verifyInviteCode } from "./actions";
import { RSVPLoadingSkeleton } from "./loading-skeleton";
import { OptionalLoginStep } from "./optional-login-step";
import { RSVPCodeEntry } from "./rsvp-code-entry";
import { RSVPFormView } from "./rsvp-form-view";

interface RSVPPageProps {
  searchParams: Promise<{
    code?: string;
    step?: string;
  }>;
}

async function RSVPContent({
  searchParams,
}: {
  searchParams: RSVPPageProps["searchParams"];
}) {
  const params = await searchParams;
  const code = params.code;
  const step = params.step;

  // Fetch wedding content for display
  const [settings, rsvpContent, detailsContent] = await Promise.all([
    getWeddingSettings(),
    getRsvpContent(),
    getDetailsContent(),
  ]);

  const rsvpTitle = rsvpContent?.title ?? "RSVP";
  const weddingDateFormatted =
    detailsContent?.dateFormatted ??
    settings.weddingDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const rsvpDeadlineText = settings.rsvpDeadline ?? undefined;

  const rsvpDisplayProps = {
    rsvpTitle,
    weddingDateFormatted,
    rsvpDeadlineText,
  };

  const thingsToDoEnabled = Boolean(settings.featureToggles.thingsToDo);

  // If code is provided, verify it server-side
  if (code && code.length >= 8) {
    const result = await verifyInviteCode(code);

    if (result.success && result.guests) {
      // Valid code - check if we should show login step or form
      if (step === "form") {
        // User has completed (or skipped) login - show the form
        return (
          <RSVPFormView
            guests={result.guests}
            inviteCode={code}
            thingsToDoEnabled={thingsToDoEnabled}
            {...rsvpDisplayProps}
          />
        );
      }
      // Show optional login step first
      return <OptionalLoginStep inviteCode={code} />;
    }

    // Invalid code - show code entry with error
    return <RSVPCodeEntry invalidCode={code} {...rsvpDisplayProps} />;
  }

  // No code - show code entry
  return <RSVPCodeEntry {...rsvpDisplayProps} />;
}

export default async function RSVPPage({ searchParams }: RSVPPageProps) {
  return (
    <Suspense fallback={<RSVPLoadingSkeleton />}>
      <RSVPContent searchParams={searchParams} />
    </Suspense>
  );
}
