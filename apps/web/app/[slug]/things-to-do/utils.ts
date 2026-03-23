/**
 * Format a date string to a short format (e.g., "Jan 5")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface Party {
  status: "interested" | "committed";
}

/**
 * Get summary text for parties interested in an activity
 */
export function getSummaryText(parties: Party[]): string {
  const committedCount = parties.filter((p) => p.status === "committed").length;
  const interestedCount = parties.filter(
    (p) => p.status === "interested",
  ).length;

  if (committedCount > 0 && interestedCount > 0) {
    return `${committedCount} going, ${interestedCount} interested`;
  }
  if (committedCount > 0) {
    return `${committedCount} going`;
  }
  return `${interestedCount} interested`;
}
