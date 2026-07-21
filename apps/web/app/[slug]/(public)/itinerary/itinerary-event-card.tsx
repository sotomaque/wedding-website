"use client";

import { Calendar, Check, ChevronDown, Clock, MapPin, X } from "lucide-react";
import { useState } from "react";

export interface ItineraryEventView {
  id: string;
  name: string;
  description: string | null;
  timeRange: string | null;
  /** e.g. "through Tuesday, July 28" for multi-day events; else null. */
  throughLabel: string | null;
  locationName: string | null;
  locationAddress: string | null;
  token: string | null;
  rsvpable: boolean;
  full: boolean;
}

function mapsHref(name: string | null, address: string | null): string | null {
  const query = address || name;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

interface AdditionalGuest {
  firstName: string;
  lastName: string;
}

export function ItineraryEventCard({
  event,
  coupleName,
}: {
  event: ItineraryEventView;
  coupleName: string;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [others, setOthers] = useState<AdditionalGuest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | {
    attending: boolean;
    code: string | null;
  }>(null);
  const [full, setFull] = useState(event.full);
  const [error, setError] = useState<string | null>(null);

  const maps = mapsHref(event.locationName, event.locationAddress);
  const canSubmit =
    attending !== null &&
    firstName.trim().length > 0 &&
    !submitting &&
    !(attending === true && full);

  async function submit() {
    if (!event.token || attending === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const additionalGuests =
        attending === true
          ? others
              .map((g) => ({
                firstName: g.firstName.trim(),
                lastName: g.lastName.trim() || undefined,
              }))
              .filter((g) => g.firstName.length > 0)
          : [];

      const res = await fetch("/api/events/rsvp/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "name",
          token: event.token,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          attending,
          ...(additionalGuests.length > 0 ? { additionalGuests } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && data.full) setFull(true);
        throw new Error(data.error || "Couldn't save your RSVP");
      }
      setDone({ attending, code: data.inviteCode ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your RSVP");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="p-5">
        <h3 className="text-lg font-semibold">{event.name}</h3>

        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {event.timeRange && (
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              {event.timeRange}
            </p>
          )}
          {event.throughLabel && (
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              {event.throughLabel}
            </p>
          )}
          {event.locationName && (
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {maps ? (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {event.locationName}
                  </a>
                ) : (
                  event.locationName
                )}
                {event.locationAddress && (
                  <span className="block text-xs">{event.locationAddress}</span>
                )}
              </span>
            </p>
          )}
        </div>

        {event.description && (
          <p className="mt-3 text-sm leading-relaxed">{event.description}</p>
        )}

        {event.rsvpable &&
          (done ? (
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
              {done.attending ? (
                <p className="font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" /> You're on the
                  list — see you there!
                </p>
              ) : (
                <p className="font-medium">Thanks for letting us know.</p>
              )}
              {done.code && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Your code to update later:{" "}
                  <span className="font-mono">{done.code}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {!open ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
                >
                  Are you coming? RSVP
                  <ChevronDown className="w-4 h-4" />
                </button>
              ) : (
                <div className="rounded-lg border p-3 space-y-3">
                  {full && (
                    <p className="text-xs rounded bg-amber-50 text-amber-800 px-2 py-1.5">
                      This one's at capacity — you can still tell us you can't
                      make it.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name (optional)"
                      className="rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAttending(true)}
                      disabled={full}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        attending === true
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "hover:border-green-300"
                      } ${full ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      I'm going
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttending(false)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        attending === false
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "hover:border-red-300"
                      }`}
                    >
                      Can't make it
                    </button>
                  </div>

                  {attending === true && (
                    <div className="space-y-2">
                      {others.map((g, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: positional rows, added/removed only at the end
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={g.firstName}
                            onChange={(e) =>
                              setOthers((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, firstName: e.target.value }
                                    : row,
                                ),
                              )
                            }
                            placeholder="Guest first name"
                            className="flex-1 rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setOthers((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                            aria-label="Remove guest"
                            className="px-2 rounded-lg border text-muted-foreground hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setOthers((prev) => [
                            ...prev,
                            { firstName: "", lastName: "" },
                          ])
                        }
                        className="text-xs text-primary underline underline-offset-2"
                      >
                        + Add someone in your party
                      </button>
                    </div>
                  )}

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      canSubmit
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {submitting ? "Saving…" : "Send RSVP"}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    No account needed — {coupleName} will see your response.
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
