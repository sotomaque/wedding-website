"use client";

import { Calendar, Check, Clock, MapPin, Plus, X } from "lucide-react";
import { useState } from "react";

interface PublicEventRsvpProps {
  token: string;
  coupleName: string;
  event: {
    name: string;
    description: string | null;
    eventDate: string | null;
    startTime: string | null;
    endTime: string | null;
    locationName: string | null;
    locationAddress: string | null;
  };
  isFull: boolean;
  closed: boolean;
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours || "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PublicEventRsvp({
  token,
  coupleName,
  event,
  isFull: initialFull,
  closed,
}: PublicEventRsvpProps) {
  const [mode, setMode] = useState<"code" | "name">("name");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [additionalGuests, setAdditionalGuests] = useState<
    { firstName: string; lastName: string }[]
  >([]);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [submittedPartyCount, setSubmittedPartyCount] = useState(1);
  const [isFull, setIsFull] = useState(initialFull);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    attending !== null &&
    !isSubmitting &&
    (mode === "code" ? code.trim().length > 0 : firstName.trim().length > 0) &&
    !(attending === true && isFull);

  async function handleSubmit() {
    if (attending === null) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Only bring household members along on an acceptance, and drop any blank
      // rows the guest left behind.
      const cleanedAdditional =
        attending === true
          ? additionalGuests
              .map((g) => ({
                firstName: g.firstName.trim(),
                lastName: g.lastName.trim() || undefined,
              }))
              .filter((g) => g.firstName.length > 0)
          : [];

      const base =
        mode === "code"
          ? { mode, token, code: code.trim(), attending }
          : {
              mode,
              token,
              firstName: firstName.trim(),
              lastName: lastName.trim() || undefined,
              email: email.trim() || undefined,
              attending,
            };
      const payload =
        cleanedAdditional.length > 0
          ? { ...base, additionalGuests: cleanedAdditional }
          : base;

      const res = await fetch("/api/events/rsvp/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.full) setIsFull(true);
        throw new Error(data.error || "Failed to submit RSVP");
      }

      setGeneratedCode(data.inviteCode ?? null);
      setSubmittedPartyCount(data.partyCount ?? 1);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (closed && !submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {event.name}
          </h1>
          <p className="text-gray-600">
            RSVPs for this event are closed. Please reach out to {coupleName} if
            you have any questions.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div
            className={`w-16 h-16 ${attending ? "bg-green-100" : "bg-gray-100"} rounded-full flex items-center justify-center mx-auto mb-4`}
          >
            {attending ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : (
              <X className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {attending ? "See You There!" : "Thanks for Letting Us Know"}
          </h1>
          <p className="text-gray-600 mb-6">
            {attending
              ? submittedPartyCount > 1
                ? `We're excited to have all ${submittedPartyCount} of you at ${event.name}!`
                : `We're excited to have you at ${event.name}!`
              : `We'll miss you at ${event.name}, but thank you for responding.`}
          </p>
          {generatedCode && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">
                Your personal code (save this to update your response later):
              </p>
              <p className="text-lg font-mono font-semibold tracking-wider text-purple-700">
                {generatedCode}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <p className="text-sm text-purple-600 font-medium mb-2">
            You're Invited
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-gray-600">{event.description}</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
          {event.eventDate && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span className="text-gray-700">
                {formatDate(event.eventDate)}
              </span>
            </div>
          )}
          {event.startTime && (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-500" />
              <span className="text-gray-700">
                {formatTime(event.startTime)}
                {event.endTime && ` - ${formatTime(event.endTime)}`}
              </span>
            </div>
          )}
          {event.locationName && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-gray-700 font-medium">
                  {event.locationName}
                </p>
                {event.locationAddress && (
                  <p className="text-gray-500 text-sm">
                    {event.locationAddress}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {isFull && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-amber-800 text-sm font-medium">
              This event has reached capacity. You can still let us know you
              can't make it.
            </p>
          </div>
        )}

        {/* Identity mode toggle */}
        <div className="flex rounded-lg border border-gray-200 p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode("name")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === "name"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Enter your name
          </button>
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === "code"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            I have a code
          </button>
        </div>

        {mode === "name" ? (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-purple-400 focus:outline-none"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 focus:border-purple-400 focus:outline-none"
            />
          </div>
        ) : (
          <div className="mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center font-mono tracking-wider text-gray-900 focus:border-purple-400 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-center">
              The code from your invitation.
            </p>
          </div>
        )}

        {/* Accept / Decline */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setAttending(true)}
            disabled={isFull}
            className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
              attending === true
                ? "bg-green-50 border-green-500 text-green-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-green-300"
            } ${isFull ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <div className="flex flex-col items-center gap-2">
              <Check
                className={`w-6 h-6 ${attending === true ? "text-green-500" : "text-gray-400"}`}
              />
              <span className="font-medium">Accept</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAttending(false)}
            className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
              attending === false
                ? "bg-red-50 border-red-500 text-red-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-red-300"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <X
                className={`w-6 h-6 ${attending === false ? "text-red-500" : "text-gray-400"}`}
              />
              <span className="font-medium">Decline</span>
            </div>
          </button>
        </div>

        {/* Additional household members — only when accepting */}
        {attending === true && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Anyone else in your party?
            </p>
            <div className="space-y-2">
              {additionalGuests.map((g, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and reorder-free
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={g.firstName}
                    onChange={(e) =>
                      setAdditionalGuests((prev) =>
                        prev.map((row, idx) =>
                          idx === i
                            ? { ...row, firstName: e.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="First name"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:border-purple-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={g.lastName}
                    onChange={(e) =>
                      setAdditionalGuests((prev) =>
                        prev.map((row, idx) =>
                          idx === i
                            ? { ...row, lastName: e.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="Last name"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:border-purple-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalGuests((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="px-3 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300"
                    aria-label="Remove guest"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setAdditionalGuests((prev) => [
                  ...prev,
                  { firstName: "", lastName: "" },
                ])
              }
              className="mt-2 inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
            >
              <Plus className="w-4 h-4" />
              Add a guest
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 px-6 rounded-lg font-medium transition-all ${
            !canSubmit
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit Response"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          Hosted by {coupleName}
        </p>
      </div>
    </div>
  );
}
