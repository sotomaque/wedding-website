"use client";

import { Users, UsersRound } from "lucide-react";

interface PartyStats {
  totalParties: number;
  totalGuests: number;
  avgGuestsPerParty: number;
  partiesBySize: { size: number; count: number }[];
}

export function PartyStatsCards({ stats }: { stats: PartyStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-secondary/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <UsersRound className="h-4 w-4" />
          <span className="text-sm">Total Parties</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {stats.totalParties}
        </p>
      </div>

      <div className="bg-secondary/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Users className="h-4 w-4" />
          <span className="text-sm">Total Guests</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {stats.totalGuests}
        </p>
      </div>

      <div className="bg-secondary/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Users className="h-4 w-4" />
          <span className="text-sm">Avg Party Size</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {stats.avgGuestsPerParty}
        </p>
      </div>

      <div className="bg-secondary/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <UsersRound className="h-4 w-4" />
          <span className="text-sm">Size Distribution</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {stats.partiesBySize.slice(0, 4).map(({ size, count }) => (
            <span
              key={size}
              className="text-xs bg-secondary px-2 py-0.5 rounded"
            >
              {size}:{count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
