"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Download, FileSpreadsheet, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_EXPORT_COLUMN_KEYS,
  GUEST_EXPORT_COLUMNS,
} from "@/lib/export/guest-columns";
import type { GuestExportFilters, RsvpScope } from "@/lib/export/guest-filter";

type Step = 1 | 2 | 3;
type Format = "csv" | "xlsx";
type Delivery = "download" | "email";

const RSVP_OPTIONS: { value: RsvpScope; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "responded", label: "Responded (accepted + declined)" },
  { value: "yes", label: "Accepted only" },
  { value: "no", label: "Declined only" },
  { value: "pending", label: "Pending only" },
];

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match?.[1] ?? null;
}

export function ExportWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [isPending, setIsPending] = useState(false);

  // Step 1 — scope
  const [rsvpStatus, setRsvpStatus] = useState<RsvpScope>("all");
  const [side, setSide] = useState<string>("all");
  const [list, setList] = useState<string>("all");

  // Step 2 — columns (all selected by default)
  const [columns, setColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_EXPORT_COLUMN_KEYS),
  );

  // Step 3 — format + delivery
  const [format, setFormat] = useState<Format>("csv");
  const [delivery, setDelivery] = useState<Delivery>("download");
  const [recipients, setRecipients] = useState("");

  function reset() {
    setStep(1);
    setRsvpStatus("all");
    setSide("all");
    setList("all");
    setColumns(new Set(DEFAULT_EXPORT_COLUMN_KEYS));
    setFormat("csv");
    setDelivery("download");
    setRecipients("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function toggleColumn(key: string, checked: boolean) {
    setColumns((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function buildFilters(): GuestExportFilters {
    const filters: GuestExportFilters = {};
    if (rsvpStatus !== "all") filters.rsvpStatus = rsvpStatus;
    if (side !== "all") filters.side = side as GuestExportFilters["side"];
    if (list !== "all") filters.list = list as GuestExportFilters["list"];
    return filters;
  }

  async function handleExport() {
    if (columns.size === 0) {
      toast.error("Select at least one column");
      setStep(2);
      return;
    }
    if (delivery === "email" && !recipients.trim()) {
      toast.error("Enter at least one recipient email");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/admin/guests/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          delivery,
          columns: [...columns],
          filters: buildFilters(),
          recipients: delivery === "email" ? recipients : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Export failed");
        return;
      }

      if (delivery === "download") {
        const blob = await res.blob();
        const filename =
          filenameFromDisposition(res.headers.get("Content-Disposition")) ??
          `guest-list.${format}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Guest list downloaded");
      } else {
        const data = await res.json();
        toast.success(
          `Guest list emailed to ${data.recipients?.length ?? 0} recipient(s)`,
        );
      }
      handleOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  const allSelected = columns.size === GUEST_EXPORT_COLUMNS.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export guest list</DialogTitle>
          <DialogDescription>
            Step {step} of 3 —{" "}
            {step === 1
              ? "choose which guests to include"
              : step === 2
                ? "pick the columns to export"
                : "choose a format and how to deliver it"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>RSVP status</Label>
              <Select
                value={rsvpStatus}
                onValueChange={(v) => setRsvpStatus(v as RsvpScope)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RSVP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Side</Label>
                <Select value={side} onValueChange={setSide}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sides</SelectItem>
                    <SelectItem value="bride">Bride</SelectItem>
                    <SelectItem value="groom">Groom</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>List</Label>
                <Select value={list} onValueChange={setList}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All lists</SelectItem>
                    <SelectItem value="a">A-List</SelectItem>
                    <SelectItem value="b">B-List</SelectItem>
                    <SelectItem value="c">C-List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {columns.size} of {GUEST_EXPORT_COLUMNS.length} columns selected
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setColumns(
                    allSelected
                      ? new Set()
                      : new Set(DEFAULT_EXPORT_COLUMN_KEYS),
                  )
                }
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
            </div>
            <ScrollArea className="h-64 rounded-md border border-border p-3">
              <div className="grid grid-cols-2 gap-3">
                {GUEST_EXPORT_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    htmlFor={`col-${col.key}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={columns.has(col.key)}
                      onCheckedChange={(checked) =>
                        toggleColumn(col.key, checked === true)
                      }
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File format</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                    format === "csv"
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("xlsx")}
                  className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                    format === "xlsx"
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDelivery("download")}
                  className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                    delivery === "download"
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setDelivery("email")}
                  className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                    delivery === "email"
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
              </div>
            </div>

            {delivery === "email" && (
              <div className="space-y-2">
                <Label htmlFor="export-recipients">Recipients</Label>
                <Input
                  id="export-recipients"
                  type="text"
                  placeholder="planner@example.com, venue@example.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple addresses with commas. The export is sent as
                  an attachment.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            disabled={step === 1 || isPending}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleExport} disabled={isPending}>
              {isPending
                ? "Exporting..."
                : delivery === "email"
                  ? "Send export"
                  : "Download export"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
