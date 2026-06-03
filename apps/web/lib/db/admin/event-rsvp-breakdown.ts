/**
 * Per-event RSVP breakdown for the admin event dashboard.
 *
 * Collects (guest, status) pairs for one event — using each guest's main RSVP
 * status for default (everyone-invited) events, or the per-event invite status
 * otherwise — then groups them into confirmed / pending / declined lists plus a
 * self-registered callout. The grouping is a pure helper so it's unit-testable
 * without a database.
 */

import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { type RsvpTally, tallyRsvpStatuses } from "./rsvp-tally";

export interface EventGuestRow {
  id: string;
  name: string;
  selfRegistered: boolean;
  inviteCode: string | null;
}

interface GuestStatusPair {
  guest: EventGuestRow;
  status: string | null;
}

export interface EventRsvpGroups {
  tally: RsvpTally;
  /** responded / total as a 0–100 integer. */
  responseRate: number;
  confirmed: EventGuestRow[];
  pending: EventGuestRow[];
  declined: EventGuestRow[];
  selfRegistered: EventGuestRow[];
}

export interface EventRsvpBreakdown extends EventRsvpGroups {
  event: {
    id: string;
    name: string;
    eventDate: string | null;
    startTime: string | null;
    endTime: string | null;
    locationName: string | null;
    locationAddress: string | null;
    capacity: number | null;
    isDefault: boolean;
  };
}

/** Group (guest, status) pairs into per-status lists + a tally + response rate. */
export function groupEventGuests(pairs: GuestStatusPair[]): EventRsvpGroups {
  const tally = tallyRsvpStatuses(pairs.map((p) => p.status));
  const responded = tally.confirmed + tally.declined;
  const responseRate =
    tally.total === 0 ? 0 : Math.round((responded / tally.total) * 100);

  return {
    tally,
    responseRate,
    confirmed: pairs.filter((p) => p.status === "yes").map((p) => p.guest),
    declined: pairs.filter((p) => p.status === "no").map((p) => p.guest),
    pending: pairs
      .filter((p) => p.status !== "yes" && p.status !== "no")
      .map((p) => p.guest),
    selfRegistered: pairs
      .filter((p) => p.guest.selfRegistered)
      .map((p) => p.guest),
  };
}

function toDateString(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date
    ? (value.toISOString().split("T")[0] ?? null)
    : String(value);
}

function toTimeString(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function rowName(g: { firstName: string; lastName: string | null }): string {
  return `${g.firstName} ${g.lastName ?? ""}`.trim();
}

export async function getEventRsvpBreakdown(
  eventId: string,
): Promise<EventRsvpBreakdown | null> {
  const weddingId = await getWeddingId();
  const event = await db.event.findFirst({ where: { id: eventId, weddingId } });
  if (!event) return null;

  let pairs: GuestStatusPair[];
  if (event.isDefault) {
    // Default events invite everyone — use each guest's main RSVP status.
    const guests = await db.guest.findMany({
      where: { weddingId, isPlusOne: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        selfRegistered: true,
        inviteCode: true,
        rsvpStatus: true,
      },
      orderBy: { firstName: "asc" },
    });
    pairs = guests.map((g) => ({
      guest: {
        id: g.id,
        name: rowName(g),
        selfRegistered: g.selfRegistered,
        inviteCode: g.inviteCode,
      },
      status: g.rsvpStatus,
    }));
  } else {
    const invites = await db.guestEventInvite.findMany({
      where: { eventId, weddingId },
      select: {
        rsvpStatus: true,
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            selfRegistered: true,
            inviteCode: true,
          },
        },
      },
      orderBy: { guest: { firstName: "asc" } },
    });
    pairs = invites.map((inv) => ({
      guest: {
        id: inv.guest.id,
        name: rowName(inv.guest),
        selfRegistered: inv.guest.selfRegistered,
        inviteCode: inv.guest.inviteCode,
      },
      status: inv.rsvpStatus,
    }));
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      eventDate: toDateString(event.eventDate),
      startTime: toTimeString(event.startTime),
      endTime: toTimeString(event.endTime),
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      capacity: event.capacity,
      isDefault: event.isDefault ?? false,
    },
    ...groupEventGuests(pairs),
  };
}
