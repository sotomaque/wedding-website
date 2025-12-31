import { Suspense } from "react";
import { RSVPLoadingSkeleton } from "./loading-skeleton";
import { RSVPClient } from "./rsvp-client";

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

  return <RSVPClient initialCode={code} />;
}

export default async function RSVPPage({ searchParams }: RSVPPageProps) {
  return (
    <Suspense fallback={<RSVPLoadingSkeleton />}>
      <RSVPContent searchParams={searchParams} />
    </Suspense>
  );
}
