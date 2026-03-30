import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";

export function createWeddingTools(weddingId: string) {
  return {
    lookupGuest: tool({
      description:
        "Find guests by name (partial match), email, or invite code. Use this to look up specific guests.",
      inputSchema: z.object({
        query: z.string().describe("Name, email, or invite code to search for"),
      }),
      execute: async ({ query }) => {
        const guests = await db.guest.findMany({
          where: {
            weddingId,
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { inviteCode: query },
            ],
          },
          take: 10,
        });

        return guests.map((g) => ({
          id: g.id,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email,
          rsvpStatus: g.rsvpStatus,
          inviteCode: g.inviteCode,
          side: g.side,
          list: g.list,
          dietaryRestrictions: g.dietaryRestrictions,
          isPlusOne: g.isPlusOne,
        }));
      },
    }),

    getRsvpStats: tool({
      description: "Get RSVP summary counts including breakdowns by list.",
      inputSchema: z.object({}),
      execute: async () => {
        const [totals, byListGroups] = await Promise.all([
          db.guest.groupBy({
            by: ["rsvpStatus"],
            where: { weddingId },
            _count: true,
          }),
          db.guest.groupBy({
            by: ["list", "rsvpStatus"],
            where: { weddingId },
            _count: true,
          }),
        ]);

        const total = totals.reduce((sum, g) => sum + g._count, 0);
        const attending =
          totals.find((g) => g.rsvpStatus === "yes")?._count ?? 0;
        const declined = totals.find((g) => g.rsvpStatus === "no")?._count ?? 0;
        const pending =
          totals.find((g) => g.rsvpStatus === "pending")?._count ?? 0;

        const byList: Record<string, { total: number; attending: number }> = {};
        for (const list of ["a", "b", "c"] as const) {
          const listRows = byListGroups.filter((g) => g.list === list);
          byList[list] = {
            total: listRows.reduce((sum, g) => sum + g._count, 0),
            attending:
              listRows.find((g) => g.rsvpStatus === "yes")?._count ?? 0,
          };
        }

        return { total, attending, declined, pending, byList };
      },
    }),

    getGuestsByStatus: tool({
      description: "List guests with a specific RSVP status.",
      inputSchema: z.object({
        status: z.enum(["yes", "no", "pending"]),
        limit: z.number().optional().describe("Max guests to return"),
      }),
      execute: async ({ status, limit }) => {
        const guests = await db.guest.findMany({
          where: { weddingId, rsvpStatus: status, isPlusOne: false },
          take: limit || 20,
        });

        return guests.map((g) => ({
          id: g.id,
          name: `${g.firstName} ${g.lastName || ""}`.trim(),
          email: g.email,
        }));
      },
    }),

    getDietarySummary: tool({
      description:
        "Get dietary restriction summary for attending guests who have restrictions.",
      inputSchema: z.object({}),
      execute: async () => {
        const guests = await db.guest.findMany({
          where: {
            weddingId,
            dietaryRestrictions: { not: null },
            rsvpStatus: "yes",
          },
        });

        const counts: Record<string, number> = {};
        const guestList = guests.map((g) => {
          const restriction = g.dietaryRestrictions ?? "";
          counts[restriction] = (counts[restriction] || 0) + 1;
          return {
            name: `${g.firstName} ${g.lastName || ""}`.trim(),
            restrictions: restriction,
          };
        });

        return { guests: guestList, summaryCounts: counts };
      },
    }),

    getEventInfo: tool({
      description: "Get all events with RSVP / invite counts.",
      inputSchema: z.object({}),
      execute: async () => {
        const events = await db.event.findMany({
          where: { weddingId },
          include: {
            _count: { select: { guestEventInvites: true } },
          },
          orderBy: { displayOrder: "asc" },
        });

        return events.map((e) => ({
          id: e.id,
          name: e.name,
          date: e.eventDate,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.locationName,
          address: e.locationAddress,
          inviteCount: e._count.guestEventInvites,
        }));
      },
    }),

    getGiftSummary: tool({
      description: "Get gift/registry summary with totals and recent gifts.",
      inputSchema: z.object({}),
      execute: async () => {
        const [aggregate, recentGifts] = await Promise.all([
          db.gift.aggregate({
            where: { weddingId },
            _sum: { amountCents: true },
            _count: true,
          }),
          db.gift.findMany({
            where: { weddingId },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        ]);

        return {
          totalAmountCents: aggregate._sum.amountCents ?? 0,
          totalAmountFormatted: `$${((aggregate._sum.amountCents ?? 0) / 100).toFixed(2)}`,
          count: aggregate._count,
          recentGifts: recentGifts.map((g) => ({
            donorName: g.donorName,
            donorEmail: g.donorEmail,
            amountCents: g.amountCents,
            amountFormatted: `$${(g.amountCents / 100).toFixed(2)}`,
            createdAt: g.createdAt,
          })),
        };
      },
    }),

    getUninvitedGuests: tool({
      description:
        "Get A-list guests who have not been sent invitations yet (numberOfResends is 0).",
      inputSchema: z.object({}),
      execute: async () => {
        const guests = await db.guest.findMany({
          where: {
            weddingId,
            numberOfResends: 0,
            isPlusOne: false,
            list: "a",
          },
        });

        return guests.map((g) => ({
          id: g.id,
          name: `${g.firstName} ${g.lastName || ""}`.trim(),
          email: g.email,
        }));
      },
    }),

    getWeddingOverview: tool({
      description:
        "Get high-level wedding stats: couple name, date, days until, guest totals, gift totals.",
      inputSchema: z.object({}),
      execute: async () => {
        const wedding = await db.wedding.findUniqueOrThrow({
          where: { id: weddingId },
        });

        const [totalGuests, totalAttending, totalDeclined, totalPending] =
          await Promise.all([
            db.guest.count({ where: { weddingId } }),
            db.guest.count({ where: { weddingId, rsvpStatus: "yes" } }),
            db.guest.count({ where: { weddingId, rsvpStatus: "no" } }),
            db.guest.count({ where: { weddingId, rsvpStatus: "pending" } }),
          ]);

        const giftAggregate = await db.gift.aggregate({
          where: { weddingId },
          _sum: { amountCents: true },
          _count: true,
        });

        const now = new Date();
        const weddingDate = new Date(wedding.weddingDate);
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          coupleName: wedding.coupleName,
          weddingDate: weddingDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          daysUntil,
          totalGuests,
          totalAttending,
          totalDeclined,
          totalPending,
          totalGifts: giftAggregate._count,
          totalGiftAmountFormatted: `$${((giftAggregate._sum.amountCents ?? 0) / 100).toFixed(2)}`,
        };
      },
    }),

    resendInvite: tool({
      description:
        "Resend an invitation email to a guest by their ID. Always confirm with the user before calling this tool.",
      inputSchema: z.object({
        guestId: z.string().describe("The guest ID to resend the invite to"),
      }),
      execute: async ({ guestId }) => {
        try {
          const guest = await db.guest.findFirst({
            where: { id: guestId, weddingId },
          });

          if (!guest) {
            return { success: false, error: "Guest not found" };
          }

          if (!guest.email || !guest.email.includes("@")) {
            return {
              success: false,
              error: "Guest does not have a valid email address",
            };
          }

          const settings = await getWeddingSettings();
          const notificationRecipients = getNotificationRecipients(settings);
          if (!getResendClient() || notificationRecipients.length === 0) {
            return { success: false, error: "Email is not configured" };
          }

          const rsvpUrl = `${weddingUrl(settings.slug, "/rsvp")}?code=${guest.inviteCode}`;

          // Fetch ceremony event for date/venue
          let weddingDate = "";
          let venueName = "";
          let venueAddress = "";
          try {
            const ceremonyEvent = await db.event.findFirst({
              where: { name: "Wedding Ceremony", weddingId },
              select: {
                eventDate: true,
                locationName: true,
                locationAddress: true,
              },
            });
            venueName = ceremonyEvent?.locationName ?? "";
            venueAddress = ceremonyEvent?.locationAddress ?? "";
            if (ceremonyEvent?.eventDate) {
              const dateObj =
                ceremonyEvent.eventDate instanceof Date
                  ? ceremonyEvent.eventDate
                  : new Date(`${ceremonyEvent.eventDate}T00:00:00`);
              if (!Number.isNaN(dateObj.getTime())) {
                weddingDate = dateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              }
            }
          } catch (dateError) {
            console.error("Error fetching wedding date:", dateError);
          }

          const rendered = await renderEmailTemplate(
            weddingId,
            "wedding_invitation",
            {
              COUPLE_NAMES: settings.coupleName,
              GUEST_NAME: `${guest.firstName} ${guest.lastName || ""}`.trim(),
              INVITE_CODE: guest.inviteCode ?? "",
              RSVP_URL: rsvpUrl,
              WEDDING_DATE: weddingDate,
              VENUE_NAME: venueName,
              VENUE_ADDRESS: venueAddress,
              PERSONAL_MESSAGE: "",
            },
            guest.preferredLanguage ?? settings.defaultLanguage,
          );

          if (!rendered) {
            return {
              success: false,
              error: "Wedding invitation template is inactive or not found",
            };
          }

          const result = await sendEmail({
            from: getEmailFromAddress(settings, "Wedding Invitation"),
            to: guest.email,
            subject: rendered.subject,
            html: rendered.html,
          });

          if (result.error) {
            console.error("Error sending email:", result.error);
            return { success: false, error: "Failed to send email" };
          }

          await db.guest.update({
            where: { id: guestId },
            data: {
              numberOfResends: (guest.numberOfResends || 0) + 1,
            },
          });

          return { success: true, sentTo: guest.email };
        } catch (error) {
          console.error("Error in resendInvite tool:", error);
          return { success: false, error: "An unexpected error occurred" };
        }
      },
    }),

    updateGuestRsvp: tool({
      description:
        "Update a guest's RSVP status. Always confirm with the user before calling this tool.",
      inputSchema: z.object({
        guestId: z.string().describe("The guest ID to update"),
        status: z
          .enum(["yes", "no", "pending"])
          .describe("The new RSVP status"),
      }),
      execute: async ({ guestId, status }) => {
        try {
          const guest = await db.guest.update({
            where: { id: guestId, weddingId },
            data: { rsvpStatus: status },
          });

          return {
            success: true,
            guest: {
              name: `${guest.firstName} ${guest.lastName || ""}`.trim(),
              newStatus: guest.rsvpStatus,
            },
          };
        } catch (error) {
          console.error("Error in updateGuestRsvp tool:", error);
          return { success: false, error: "Guest not found or update failed" };
        }
      },
    }),
  };
}
