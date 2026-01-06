import { Suspense } from "react";
import {
  getGiftStats,
  getGifts,
  getGiftWithGuest,
  getGuestOptions,
} from "./actions";
import { EditGiftSheet } from "./edit-gift-sheet";
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
    edit?: string;
  }>;
}

async function GiftsContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;

  let gifts: Awaited<ReturnType<typeof getGifts>> = [];
  let stats: Awaited<ReturnType<typeof getGiftStats>>;
  let error: string | null = null;

  try {
    [gifts, stats] = await Promise.all([getGifts(params), getGiftStats()]);
  } catch (e) {
    console.error("Error fetching gifts:", e);
    error = "Failed to load gifts. Please try again.";
    stats = {
      baby_fund: { total: 0, count: 0 },
      honeymoon: { total: 0, count: 0 },
      student_loans: { total: 0, count: 0 },
      unknown: { total: 0, count: 0 },
      grand_total: 0,
      total_count: 0,
    };
  }

  return <GiftsTable initialGifts={gifts} stats={stats} error={error} />;
}

async function EditGiftSheetWrapper({ giftId }: { giftId: string }) {
  const [gift, guestOptions] = await Promise.all([
    getGiftWithGuest(giftId),
    getGuestOptions(),
  ]);

  if (!gift) {
    return null;
  }

  return <EditGiftSheet gift={gift} guestOptions={guestOptions} />;
}

export default async function AdminGiftsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editGiftId = params.edit;

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-2 py-4 sm:px-4 md:px-8 md:py-8 border border-border">
          <Suspense fallback={<GiftsTableSkeleton />}>
            <GiftsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>

      {editGiftId && (
        <Suspense fallback={null}>
          <EditGiftSheetWrapper giftId={editGiftId} />
        </Suspense>
      )}
    </div>
  );
}
