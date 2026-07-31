"use client";

import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ThankYouPhotosCardProps {
  confirmedCount: number;
}

export function ThankYouPhotosCard({
  confirmedCount,
}: ThankYouPhotosCardProps) {
  const [busy, setBusy] = useState<null | "preview" | "send">(null);

  async function trigger(mode: "preview" | "send") {
    if (busy) return;
    setBusy(mode);
    try {
      const res = await fetch("/api/admin/guests/send-thank-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send thank-you email");
        return;
      }

      if (mode === "preview") {
        const to = Array.isArray(data.sentTo) ? data.sentTo.join(", ") : "you";
        toast.success(`Preview sent to ${to}. Check your inbox.`);
      } else {
        toast.success(
          `Thank-you sent to ${data.sent} guest(s)` +
            (data.failed ? ` — ${data.failed} failed` : ""),
        );
      }
    } catch {
      toast.error("Something went wrong sending the thank-you email");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border rounded-lg p-5 mb-8 bg-card">
      <h2 className="text-lg font-semibold">Thank you + photo request</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        After the wedding, thank your guests for coming and ask them to upload
        the photos they took — the link needs no account and has room for their
        whole camera roll. Send yourself a preview first.
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
          title="Send the thank-you email?"
          description={`This emails the thank-you + photo request to all ${confirmedCount} confirmed guest${
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
