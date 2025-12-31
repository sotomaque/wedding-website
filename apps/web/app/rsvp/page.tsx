import { Suspense } from "react";
import { verifyInviteCode } from "./actions";
import { RSVPLoadingSkeleton } from "./loading-skeleton";
import { RSVPCodeEntry } from "./rsvp-code-entry";
import { RSVPFormView } from "./rsvp-form-view";

interface RSVPPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

async function RSVPContent({
  searchParams,
}: {
  searchParams: RSVPPageProps["searchParams"];
}) {
  const params = await searchParams;
  const code = params.code;

  // If code is provided, verify it server-side
  if (code && code.length >= 8) {
    const result = await verifyInviteCode(code);

    if (result.success && result.guests) {
      // Valid code - show the form directly with pre-fetched guests
      return <RSVPFormView guests={result.guests} inviteCode={code} />;
    }

    // Invalid code - show code entry with error
    return <RSVPCodeEntry invalidCode={code} />;
  }

  // No code - show code entry
  return <RSVPCodeEntry />;
}

export default async function RSVPPage({ searchParams }: RSVPPageProps) {
  return (
    <Suspense fallback={<RSVPLoadingSkeleton />}>
      <RSVPContent searchParams={searchParams} />
    </Suspense>
  );
}
