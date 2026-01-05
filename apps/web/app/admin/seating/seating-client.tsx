"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { LayoutGrid, Plus, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { SeatingChart } from "@/lib/types/seating";

interface SeatingClientProps {
  initialCharts: SeatingChart[];
  confirmedGuestsCount: number;
}

export function SeatingClient({
  initialCharts,
  confirmedGuestsCount,
}: SeatingClientProps) {
  const router = useRouter();
  const [charts, setCharts] = useState<SeatingChart[]>(initialCharts);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newChartName, setNewChartName] = useState("");
  const [seatsPerTable, setSeatsPerTable] = useState(8);

  const handleCreateChart = async () => {
    if (!newChartName.trim()) {
      toast.error("Please enter a chart name");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/seating-charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChartName.trim(),
          defaultSeatsPerTable: seatsPerTable,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create chart");
      }

      const { chart } = await response.json();
      setCharts([chart, ...charts]);
      setIsCreateDialogOpen(false);
      setNewChartName("");
      setSeatsPerTable(8);
      toast.success("Seating chart created");
      router.push(`/admin/seating/${chart.id}`);
    } catch (error) {
      console.error("Error creating chart:", error);
      toast.error("Failed to create seating chart");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChart = async (chartId: string) => {
    if (!confirm("Are you sure you want to delete this seating chart?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/seating-charts/${chartId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete chart");
      }

      setCharts(charts.filter((c) => c.id !== chartId));
      toast.success("Seating chart deleted");
    } catch (error) {
      console.error("Error deleting chart:", error);
      toast.error("Failed to delete seating chart");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Seating Charts</h1>
          <p className="text-muted-foreground">
            {confirmedGuestsCount} confirmed guests to seat
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Chart
        </Button>
      </div>

      {/* Charts Grid */}
      {charts.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No seating charts yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first seating chart to start arranging guests at tables.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Seating Chart
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="border rounded-lg p-4 hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium">{chart.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {chart.default_seats_per_table} seats per table
                  </p>
                </div>
                {chart.is_active && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Active
                  </span>
                )}
              </div>

              {chart.notes && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {chart.notes}
                </p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t">
                <Link href={`/admin/seating/${chart.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteChart(chart.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Chart Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Seating Chart</DialogTitle>
            <DialogDescription>
              Create a new seating chart to arrange your wedding guests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chart-name">Chart Name</Label>
              <Input
                id="chart-name"
                placeholder="e.g., Reception Seating"
                value={newChartName}
                onChange={(e) => setNewChartName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seats-per-table">Default Seats per Table</Label>
              <Input
                id="seats-per-table"
                type="number"
                min={2}
                max={20}
                value={seatsPerTable}
                onChange={(e) => setSeatsPerTable(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                You can override this for individual tables later.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateChart} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Chart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
