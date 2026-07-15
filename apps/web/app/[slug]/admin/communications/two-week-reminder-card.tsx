"use client";

import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface TwoWeekReminderCardProps {
  confirmedCount: number;
}

export function TwoWeekReminderCard({
  confirmedCount,
}: TwoWeekReminderCardProps) {
  const [busy, setBusy] = useState<null | "preview" | "send">(null);

  async function trigger(mode: "preview" | "send") {
    if (busy) return;
    setBusy(mode);
    try {
      const res = await fetch("/api/admin/guests/send-two-week-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send reminder");
        return;
      }

      if (mode === "preview") {
        const to = Array.isArray(data.sentTo) ? data.sentTo.join(", ") : "you";
        toast.success(`Preview sent to ${to}. Check your inbox.`);
      } else {
        toast.success(
          `Reminder sent to ${data.sent} guest(s)` +
            (data.failed ? ` — ${data.failed} failed` : "") +
            (data.skipped ? `, ${data.skipped} skipped (no email)` : ""),
        );
      }
    } catch {
      toast.error("Something went wrong sending the reminder");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border rounded-lg p-5 mb-8 bg-card">
      <h2 className="text-lg font-semibold">Two-week reminder</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Email all confirmed guests the wedding schedule and a link to your
        registry. Send yourself a preview first to check it looks right.
        {confirmedCount === 0
          ? " No guests have confirmed with an email address yet."
          : ` ${confirmedCount} confirmed guest${
              confirmedCount === 1 ? "" : "s"
            } will receive it.`}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => trigger("preview")}
        >
          {busy === "preview" ? "Sending…" : "Send preview to me"}
        </Button>
        <ConfirmDialog
          trigger={
            <Button disabled={busy !== null || confirmedCount === 0}>
              {busy === "send"
                ? "Sending…"
                : `Send to ${confirmedCount} confirmed guest${
                    confirmedCount === 1 ? "" : "s"
                  }`}
            </Button>
          }
          title="Send the two-week reminder?"
          description={`This emails the reminder to all ${confirmedCount} confirmed guest${
            confirmedCount === 1 ? "" : "s"
          } who have an email address. This can't be undone.`}
          confirmLabel="Send to all"
          variant="default"
          onConfirm={() => trigger("send")}
        />
      </div>
    </div>
  );
}
