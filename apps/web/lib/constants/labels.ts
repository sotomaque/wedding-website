/**
 * Shared display labels and badge color classes for guest / gift enums.
 *
 * These were previously redefined in each component that rendered them, which
 * meant a wording or color tweak had to be hunted down across the guest table,
 * filters, edit sheets, and the gifts views. Centralizing keeps them in sync.
 *
 * Note: the guest-list export module (lib/export/guest-columns.ts) intentionally
 * renders RSVP "yes" as "Accepted" for the exported file's audience and keeps
 * its own labels — it is not consolidated here.
 */

// --- RSVP status (admin wording) ---
export const RSVP_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  yes: "Confirmed",
  no: "Declined",
};

export const RSVP_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  yes: "bg-green-100 text-green-800",
  no: "bg-red-100 text-red-800",
};

// --- Gift type ---
export const GIFT_TYPE_LABELS: Record<string, string> = {
  baby_fund: "Baby Fund",
  honeymoon: "Honeymoon",
  student_loans: "Student Loans",
};

export const GIFT_TYPE_COLORS: Record<string, string> = {
  baby_fund: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  honeymoon: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  student_loans:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// --- Gift status ---
export const GIFT_STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refunded:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
