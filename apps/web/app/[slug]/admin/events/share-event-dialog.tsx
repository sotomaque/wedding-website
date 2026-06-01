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
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Share dialog for an event's public RSVP link. Mints the link on open (via the
 * share endpoint, which is idempotent) and offers a one-tap copy. The link
 * carries rich Open Graph / iMessage previews via the route's opengraph-image.
 */
export function ShareEventDialog({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
      </DialogContent>
    </Dialog>
  );
}
