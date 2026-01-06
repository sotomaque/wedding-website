import { Suspense } from "react";
import { getGiftStats, getGifts } from "./actions";
import { GiftsTable } from "./gifts-table";
import { GiftsTableSkeleton } from "./gifts-table-skeleton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    giftType?: "baby_fund" | "honeymoon" | "student_loans";
    status?: "pending" | "completed" | "refunded" | "failed";
    thankYouSent?: "true" | "false";
    hasGuest?: "true" | "false";
    sortBy?:
      | "created_at"
      | "amount_cents"
      | "donor_name"
      | "gift_type"
      | "status";
    sortOrder?: "asc" | "desc";
    page?: string;
  }>;
}

async function GiftsContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const [gifts, stats] = await Promise.all([getGifts(params), getGiftStats()]);

  return <GiftsTable initialGifts={gifts} stats={stats} />;
}

export default async function AdminGiftsPage({ searchParams }: PageProps) {
  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-2 py-4 sm:px-4 md:px-8 md:py-8 border border-border">
          <Suspense fallback={<GiftsTableSkeleton />}>
            <GiftsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
