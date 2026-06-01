import { BarChart3 } from "lucide-react";
import type {
  DashboardStats,
  DimensionBreakdown,
} from "@/lib/db/admin/dashboard-stats";

/** Segmented bar: attending (green) / pending (amber) / declined (muted). */
function SegmentedBar({ row }: { row: DimensionBreakdown }) {
  const total = row.total || 1;
  const segments = [
    { value: row.attending, className: "bg-green-500" },
    { value: row.pending, className: "bg-amber-400" },
    { value: row.declined, className: "bg-muted-foreground/40" },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((segment, i) =>
        segment.value > 0 ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 3-segment order
            key={i}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

function BreakdownSection({
  title,
  rows,
}: {
  title: string;
  rows: DimensionBreakdown[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">
        {title}
      </h4>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {row.attending} / {row.total}{" "}
                <span className="text-xs">attending</span>
              </span>
            </div>
            <SegmentedBar row={row} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: number;
  dotClassName: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
      <span className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Live RSVP snapshot for the admin dashboard: overall response rate, top-line
 * attending / declined / pending counts, and breakdowns by list, side, and
 * event. Server-rendered — data comes from getDashboardStats().
 */
export function RsvpStatsPanel({ stats }: { stats: DashboardStats }) {
  const { totals, responseRate, byList, bySide, byEvent } = stats;
  const responded = totals.attending + totals.declined;

  return (
    <div className="p-6 bg-secondary rounded-lg">
      <div className="flex items-center gap-3 mb-5">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h3 className="font-semibold text-foreground">RSVP Overview</h3>
      </div>

      {/* Response rate */}
      <div className="mb-5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {responseRate}%
            </p>
            <p className="text-sm text-muted-foreground">
              responded ({responded} of {totals.totalGuests} guests)
            </p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${responseRate}%` }}
          />
        </div>
      </div>

      {/* Top-line counts */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6">
        <StatChip
          label="attending"
          value={totals.attending}
          dotClassName="bg-green-500"
        />
        <StatChip
          label="pending"
          value={totals.pending}
          dotClassName="bg-amber-400"
        />
        <StatChip
          label="declined"
          value={totals.declined}
          dotClassName="bg-muted-foreground/40"
        />
      </div>

      {/* Breakdowns */}
      {(byList.length > 0 || bySide.length > 0 || byEvent.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-border">
          <BreakdownSection title="By List" rows={byList} />
          <BreakdownSection title="By Side" rows={bySide} />
          <BreakdownSection title="By Event" rows={byEvent} />
        </div>
      )}
    </div>
  );
}
