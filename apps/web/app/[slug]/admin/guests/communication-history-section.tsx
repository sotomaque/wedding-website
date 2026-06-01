"use client";

import { Badge } from "@workspace/ui/components/badge";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface EmailLogEntry {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  recipientEmail: string;
  errorMessage: string | null;
  createdAt: string;
}

// Friendly labels for the email types we log. Unknown/custom types fall back to
// a title-cased version of the raw value.
const TYPE_LABELS: Record<string, string> = {
  wedding_invitation: "Wedding Invitation",
  event_invitation: "Event Invitation",
  activities_invitation: "Activities Invitation",
  calendar_invite: "Calendar Invite",
  rsvp_reminder: "RSVP Reminder",
  rsvp_confirmation: "RSVP Confirmation",
  custom: "Custom Email",
};

function typeLabel(type: string): string {
  return (
    TYPE_LABELS[type] ??
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function CommunicationHistorySection({ guestId }: { guestId: string }) {
  const [logs, setLogs] = useState<EmailLogEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/guests/${guestId}/email-log`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setLogs(data.logs ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  return (
    <div className="border-t pt-4 mt-2 space-y-3">
      <h3 className="text-sm font-semibold">Communication History</h3>

      {error ? (
        <p className="text-sm text-muted-foreground">
          Couldn't load communication history.
        </p>
      ) : logs === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emails recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {typeLabel(log.type)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {log.subject || log.recipientEmail}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {log.status === "failed" && (
                  <Badge variant="destructive">Failed</Badge>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
