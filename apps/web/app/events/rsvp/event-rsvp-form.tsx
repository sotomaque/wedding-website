"use client";

import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { useState } from "react";

interface Guest {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  inviteCode: string;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
}

interface Invite {
  id: string;
  rsvpStatus: "pending" | "yes" | "no";
}

interface EventRSVPFormProps {
  guest: Guest;
  event: Event;
  invite: Invite;
}

export function EventRSVPForm({ guest, event, invite }: EventRSVPFormProps) {
  const [attending, setAttending] = useState<boolean | null>(
    invite.rsvpStatus === "yes"
      ? true
      : invite.rsvpStatus === "no"
        ? false
        : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  async function handleSubmit() {
    if (attending === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/events/rsvp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: guest.inviteCode,
          eventId: event.id,
          attending,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit RSVP");
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting RSVP:", err);
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Already submitted - show confirmation
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
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
              ? `We're excited to have you at ${event.name}!`
              : `We'll miss you at ${event.name}, but thank you for responding.`}
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">
              Your response has been recorded. If you need to change your
              response, simply use the link in your invitation email again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show RSVP form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
        {/* Header */}
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

        {/* Event Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
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

        {/* Guest Greeting */}
        <div className="text-center mb-6">
          <p className="text-gray-700">
            Hello, <span className="font-semibold">{guest.firstName}</span>!
          </p>
          <p className="text-gray-600 text-sm mt-1">Will you be joining us?</p>
        </div>

        {/* RSVP Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setAttending(true)}
            className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
              attending === true
                ? "bg-green-50 border-green-500 text-green-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-green-300"
            }`}
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={attending === null || isSubmitting}
          className={`w-full py-4 px-6 rounded-lg font-medium transition-all ${
            attending === null || isSubmitting
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit Response"}
        </button>

        {/* Previous Response Notice */}
        {invite.rsvpStatus !== "pending" && (
          <p className="text-center text-sm text-gray-500 mt-4">
            You previously{" "}
            {invite.rsvpStatus === "yes" ? "accepted" : "declined"}. You can
            update your response above.
          </p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Hosted by Helen & Enrique
        </p>
      </div>
    </div>
  );
}
