"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Share dialog for an event's public RSVP link. Mints the link on open (via the
 * share endpoint, which is idempotent) and offers a one-tap copy. The link
 * carries rich Open Graph / iMessage previews via the route's opengraph-image.
 * A toggle lets the couple stop accepting RSVPs without deleting the link.
 */
export function ShareEventDialog({
  eventId,
  eventName,
  initialEnabled,
}: {
  eventId: string;
  eventName: string;
  initialEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savingEnabled, setSavingEnabled] = useState(false);

  async function loadLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/share`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");
      setUrl(data.url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create share link",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !url) loadLink();
  }

  async function toggleEnabled(next: boolean) {
    setEnabled(next);
    setSavingEnabled(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicRsvpEnabled: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(next ? "RSVPs reopened" : "RSVPs closed");
    } catch {
      setEnabled(!next); // revert on failure
      toast.error("Couldn't update RSVP status");
    } finally {
      setSavingEnabled(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share “{eventName}”</DialogTitle>
          <DialogDescription>
            Anyone with this link can RSVP to this event — with the code from
            their invitation, or by entering their name.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={loading ? "Generating link…" : (url ?? "")}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copy}
            disabled={!url}
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Shared links show a rich preview (event name, date, and your hero
          image) in iMessage and on social apps.
        </p>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="accept-rsvps">Accept RSVPs</Label>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "The link is open and accepting responses."
                : "The link is closed — new guests can't RSVP."}
            </p>
          </div>
          <Switch
            id="accept-rsvps"
            checked={enabled}
            disabled={savingEnabled}
            onCheckedChange={toggleEnabled}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
