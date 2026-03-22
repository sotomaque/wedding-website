import Link from "next/link";
import { db } from "@/lib/db";
import { StatusActions } from "./status-actions";

export default async function PlatformAdminPage() {
  const [weddings, totalRsvpYes] = await Promise.all([
    db.wedding.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { guests: true, events: true } },
        weddingAdmins: { select: { email: true, role: true } },
      },
    }),
    db.guest.count({ where: { rsvpStatus: "yes" } }),
  ]);

  const totalWeddings = weddings.length;
  const totalGuests = weddings.reduce((sum, w) => sum + w._count.guests, 0);
  const published = weddings.filter((w) => w.status === "published").length;
  const draft = weddings.filter((w) => w.status === "draft").length;
  const archived = weddings.filter((w) => w.status === "archived").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Weddings" value={totalWeddings} />
        <StatCard label="Published" value={published} />
        <StatCard label="Draft" value={draft} />
        <StatCard label="Archived" value={archived} />
        <StatCard label="Total Guests" value={totalGuests} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-serif">All Weddings</h2>
        <p className="text-sm text-muted-foreground">
          {totalRsvpYes} total RSVPs (yes)
        </p>
      </div>

      {/* Wedding table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Couple Name</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Guests</th>
                <th className="text-left px-4 py-3 font-medium">Admins</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {weddings.map((wedding) => (
                <tr
                  key={wedding.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {wedding.coupleName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    /{wedding.slug}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {wedding.weddingDate
                      ? new Date(wedding.weddingDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : "Not set"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wedding.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {wedding._count.guests}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {wedding.weddingAdmins.map((a) => a.email).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(wedding.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${wedding.slug}/admin`}
                        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        View Admin
                      </Link>
                      <StatusActions
                        weddingId={wedding.id}
                        currentStatus={wedding.status}
                        coupleName={wedding.coupleName}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {weddings.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No weddings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    draft:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full capitalize ${styles[status] ?? styles.archived}`}
    >
      {status}
    </span>
  );
}
