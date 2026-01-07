export function PartiesTableSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-secondary rounded" />
        <div className="h-10 w-32 bg-secondary rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-secondary/30 rounded-lg p-4 border border-border"
          >
            <div className="h-4 w-24 bg-secondary rounded mb-2" />
            <div className="h-8 w-16 bg-secondary rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-secondary/50 px-4 py-3">
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-secondary rounded" />
            <div className="h-4 w-32 bg-secondary rounded" />
            <div className="h-4 w-20 bg-secondary rounded" />
            <div className="h-4 w-16 bg-secondary rounded" />
            <div className="h-4 w-16 bg-secondary rounded" />
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 border-t border-border">
            <div className="flex gap-4 items-center">
              <div className="h-5 w-20 bg-secondary rounded" />
              <div className="h-5 w-40 bg-secondary rounded" />
              <div className="h-5 w-16 bg-secondary rounded" />
              <div className="h-5 w-12 bg-secondary rounded" />
              <div className="h-8 w-20 bg-secondary rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
