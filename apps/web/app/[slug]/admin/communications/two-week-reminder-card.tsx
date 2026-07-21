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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface EventOption {
  id: string;
  name: string;
}

interface AudienceGuest {
  id: string;
  name: string;
  email: string;
}

interface TwoWeekReminderCardProps {
  /** Count of all confirmed guests with an email (seeds the default scope). */
  confirmedCount: number;
  events: EventOption[];
}

const ALL_SCOPE = "all";

export function TwoWeekReminderCard({
  confirmedCount,
  events,
}: TwoWeekReminderCardProps) {
  const [busy, setBusy] = useState<null | "preview" | "send">(null);
  // Audience scope: "all" or an event id.
  const [scope, setScope] = useState<string>(ALL_SCOPE);
  // Resolved audience for the current scope; null while (re)loading.
  const [audience, setAudience] = useState<AudienceGuest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eventId = scope === ALL_SCOPE ? null : scope;
  const scopeLabel =
    scope === ALL_SCOPE
      ? "all confirmed guests"
      : `guests confirmed for ${
          events.find((e) => e.id === scope)?.name ?? "this event"
        }`;

  // Load the audience whenever the scope changes so the count + picker match.
  const loadAudience = useCallback(async () => {
    setLoading(true);
    try {
      const qs = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
      const res = await fetch(`/api/admin/guests/send-two-week-reminder${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Couldn't load the guest list");
        setAudience([]);
        return;
      }
      const guests: AudienceGuest[] = data.guests ?? [];
      setAudience(guests);
      // Pre-check everyone in scope; the admin unchecks to exclude.
      setSelected(new Set(guests.map((g) => g.id)));
    } catch {
      toast.error("Couldn't load the guest list");
      setAudience([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadAudience();
  }, [loadAudience]);

  // Count shown on the send button: live audience length, falling back to the
  // server-provided all-confirmed count before the first fetch resolves.
  const count =
    audience !== null
      ? audience.length
      : scope === ALL_SCOPE
        ? confirmedCount
        : null;
  const selectedCount = selected.size;

  async function sendReminder(guestIds?: string[]) {
    if (busy) return;
    setBusy("send");
    try {
      const res = await fetch("/api/admin/guests/send-two-week-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send", eventId, guestIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send reminder");
        return;
      }
      toast.success(
        `Reminder sent to ${data.sent} guest(s)` +
          (data.failed ? ` — ${data.failed} failed` : "") +
          (data.skipped ? `, ${data.skipped} skipped (no email)` : ""),
      );
      setPickerOpen(false);
    } catch {
      toast.error("Something went wrong sending the reminder");
    } finally {
      setBusy(null);
    }
  }

  async function sendPreview() {
    if (busy) return;
    setBusy("preview");
    try {
      const res = await fetch("/api/admin/guests/send-two-week-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send preview");
        return;
      }
      const to = Array.isArray(data.sentTo) ? data.sentTo.join(", ") : "you";
      toast.success(`Preview sent to ${to}. Check your inbox.`);
    } catch {
      toast.error("Something went wrong sending the preview");
    } finally {
      setBusy(null);
    }
  }

  function toggleGuest(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected = audience !== null && selectedCount === audience.length;
  function toggleAll(checked: boolean) {
    if (!audience) return;
    setSelected(checked ? new Set(audience.map((g) => g.id)) : new Set());
  }

  const countLabel = count === null ? "…" : count.toLocaleString();

  return (
    <div className="border rounded-lg p-5 mb-8 bg-card">
      <h2 className="text-lg font-semibold">Two-week reminder</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Email confirmed guests the wedding schedule and a link to your registry.
        Send yourself a preview first to check it looks right.
      </p>

      {/* Audience scope: all confirmed guests, or guests confirmed for one event */}
      <div className="mb-4 max-w-sm">
        <label
          htmlFor="reminder-audience"
          className="block text-sm font-medium mb-1"
        >
          Who receives it
        </label>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger id="reminder-audience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SCOPE}>All confirmed guests</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                Confirmed for {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {count === 0
            ? "No one in this group has confirmed with an email address yet."
            : `${countLabel} ${
                count === 1 ? "guest" : "guests"
              } will receive it.`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={sendPreview}
        >
          {busy === "preview" ? "Sending…" : "Send preview to me"}
        </Button>
        <ConfirmDialog
          trigger={
            <Button disabled={busy !== null || loading || !count}>
              {busy === "send"
                ? "Sending…"
                : `Send to ${countLabel} confirmed guest${
                    count === 1 ? "" : "s"
                  }`}
            </Button>
          }
          title="Send the two-week reminder?"
          description={`This emails the reminder to ${scopeLabel} (${countLabel}). This can't be undone.`}
          confirmLabel="Send to all"
          variant="default"
          onConfirm={() => sendReminder()}
        />
      </div>

      {/* Manual override: pick exactly who to send to */}
      <button
        type="button"
        className="mt-3 text-sm text-primary underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
        disabled={loading || !audience || audience.length === 0}
        onClick={() => setPickerOpen(true)}
      >
        Choose specific guests…
      </button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose who to send to</DialogTitle>
            <DialogDescription>
              Everyone {scopeLabel} is selected. Uncheck anyone you want to
              leave out, then send.
            </DialogDescription>
          </DialogHeader>

          {audience && audience.length > 0 && (
            <div className="flex items-center gap-2 border-b pb-2">
              <Checkbox
                id="reminder-select-all"
                checked={allSelected}
                onCheckedChange={(c) => toggleAll(c === true)}
              />
              <label htmlFor="reminder-select-all" className="text-sm">
                Select all ({audience.length})
              </label>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {audience?.map((g) => (
              <label
                key={g.id}
                htmlFor={`reminder-guest-${g.id}`}
                className="flex items-center gap-3 py-2 cursor-pointer"
              >
                <Checkbox
                  id={`reminder-guest-${g.id}`}
                  checked={selected.has(g.id)}
                  onCheckedChange={(c) => toggleGuest(g.id, c === true)}
                />
                <span className="min-w-0">
                  <span className="block text-sm truncate">{g.name}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {g.email}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <span className="text-sm text-muted-foreground self-center">
              {selectedCount} selected
            </span>
            <ConfirmDialog
              trigger={
                <Button disabled={busy !== null || selectedCount === 0}>
                  {busy === "send"
                    ? "Sending…"
                    : `Send to ${selectedCount} selected`}
                </Button>
              }
              title="Send to the selected guests?"
              description={`This emails the reminder to ${selectedCount} selected guest${
                selectedCount === 1 ? "" : "s"
              }. This can't be undone.`}
              confirmLabel="Send"
              variant="default"
              onConfirm={() => sendReminder([...selected])}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
