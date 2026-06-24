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
import { generateInviteCode } from "@/lib/utils/invite-code";

export function createWeddingTools(weddingId: string) {
  return {
    lookupGuest: tool({
      description:
        "Find guests by name (partial match), email, or invite code. Supports full names like 'Jacob Foster' or partial matches like 'Jacob'.",
      inputSchema: z.object({
        query: z.string().describe("Name, email, or invite code to search for"),
      }),
      execute: async ({ query }) => {
        const words = query.trim().split(/\s+/);

        // Build OR conditions: each word matches firstName or lastName,
        // plus always try the full query against email and invite code
        const conditions: Record<string, unknown>[] = [];

        // Full-name match: if multiple words, try first word = firstName AND last word = lastName
        if (words.length >= 2) {
          conditions.push({
            firstName: {
              contains: words[0],
              mode: "insensitive",
            },
            lastName: {
              contains: words[words.length - 1],
              mode: "insensitive",
            },
          });
        }

        // Individual word matches against first or last name
        for (const word of words) {
          conditions.push({
            firstName: { contains: word, mode: "insensitive" },
          });
          conditions.push({
            lastName: { contains: word, mode: "insensitive" },
          });
        }

        // Email and invite code match on full query
        conditions.push({
          email: { contains: query, mode: "insensitive" },
        });
        conditions.push({ inviteCode: query });

        const guests = await db.guest.findMany({
          where: {
            weddingId,
            OR: conditions,
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
      description:
        "List guests filtered by RSVP status, side, list tier, and/or family. Use this for questions like 'who from the bride's side hasn't RSVP'd' or 'which A-list family members are attending'.",
      inputSchema: z.object({
        status: z
          .enum(["yes", "no", "pending"])
          .optional()
          .describe("Filter by RSVP status"),
        side: z
          .enum(["bride", "groom", "both"])
          .optional()
          .describe("Filter by side (bride, groom, or both)"),
        list: z
          .enum(["a", "b", "c"])
          .optional()
          .describe("Filter by list tier"),
        family: z
          .boolean()
          .optional()
          .describe("Filter by family member status"),
        limit: z
          .number()
          .optional()
          .describe("Max guests to return (default 30)"),
      }),
      execute: async ({ status, side, list, family, limit }) => {
        const where: Record<string, unknown> = {
          weddingId,
          isPlusOne: false,
        };
        if (status) where.rsvpStatus = status;
        if (side) where.side = side;
        if (list) where.list = list;
        if (family !== undefined) where.family = family;

        const guests = await db.guest.findMany({
          where,
          take: limit || 30,
        });

        return guests.map((g) => ({
          id: g.id,
          name: `${g.firstName} ${g.lastName || ""}`.trim(),
          email: g.email,
          side: g.side,
          list: g.list,
          rsvpStatus: g.rsvpStatus,
          family: g.family,
          notes: g.notes,
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
            where: { weddingId, status: "completed" },
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
          where: { weddingId, status: "completed" },
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
            log: { weddingId, guestId: guest.id, type: "wedding_invitation" },
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

    createGuest: tool({
      description:
        "Create a new guest. Always confirm the details with the user before calling. Returns the created guest with their invite code.",
      inputSchema: z.object({
        firstName: z.string().describe("Guest's first name"),
        lastName: z.string().optional().describe("Guest's last name"),
        email: z.string().optional().describe("Guest's email address"),
        side: z
          .enum(["bride", "groom", "both"])
          .optional()
          .describe("Which side of the wedding (bride, groom, or both)"),
        list: z
          .enum(["a", "b", "c"])
          .optional()
          .describe("Guest list tier: a (A-list), b (B-list), c (C-list)"),
        gender: z
          .enum(["male", "female"])
          .optional()
          .describe("Guest's gender"),
        family: z
          .boolean()
          .optional()
          .describe("Whether this guest is a family member"),
        plusOneAllowed: z
          .boolean()
          .optional()
          .describe("Whether this guest can bring a plus-one"),
        notes: z
          .string()
          .optional()
          .describe("Any notes about the guest (e.g. 'college friend')"),
      }),
      execute: async ({
        firstName,
        lastName,
        email,
        side,
        list,
        gender,
        family,
        plusOneAllowed,
        notes,
      }) => {
        try {
          const inviteCode = generateInviteCode();

          // Create party for this guest
          const party = await db.party.create({
            data: {
              weddingId,
              inviteCode,
            },
          });

          const guest = await db.guest.create({
            data: {
              weddingId,
              firstName,
              lastName: lastName ?? null,
              email: email ?? null,
              side: side ?? null,
              list: list ?? "a",
              gender: gender ?? null,
              family: family ?? false,
              plusOneAllowed: plusOneAllowed ?? false,
              notes: notes ?? null,
              inviteCode,
              partyId: party.id,
            },
          });

          return {
            success: true,
            guest: {
              id: guest.id,
              name: `${guest.firstName} ${guest.lastName || ""}`.trim(),
              email: guest.email,
              inviteCode: guest.inviteCode,
              side: guest.side,
              list: guest.list,
            },
          };
        } catch (error) {
          console.error("Error in createGuest tool:", error);
          return { success: false, error: "Failed to create guest" };
        }
      },
    }),

    updateGuest: tool({
      description:
        "Update a guest's information. Use lookupGuest first to find the guest ID. Always confirm changes with the user before calling.",
      inputSchema: z.object({
        guestId: z.string().describe("The guest ID to update"),
        firstName: z.string().optional().describe("New first name"),
        lastName: z.string().optional().describe("New last name"),
        email: z.string().optional().describe("New email address"),
        side: z
          .enum(["bride", "groom", "both"])
          .optional()
          .describe("New side assignment"),
        list: z.enum(["a", "b", "c"]).optional().describe("New list tier"),
        gender: z.enum(["male", "female"]).optional().describe("New gender"),
        family: z.boolean().optional().describe("Is a family member"),
        plusOneAllowed: z.boolean().optional().describe("Allow plus-one"),
        dietaryRestrictions: z
          .string()
          .optional()
          .describe("Dietary restrictions"),
        notes: z.string().optional().describe("Guest notes"),
      }),
      execute: async ({ guestId, ...updates }) => {
        try {
          // Filter out undefined values
          const data: Record<string, unknown> = {};
          if (updates.firstName !== undefined)
            data.firstName = updates.firstName;
          if (updates.lastName !== undefined) data.lastName = updates.lastName;
          if (updates.email !== undefined) data.email = updates.email;
          if (updates.side !== undefined) data.side = updates.side;
          if (updates.list !== undefined) data.list = updates.list;
          if (updates.gender !== undefined) data.gender = updates.gender;
          if (updates.family !== undefined) data.family = updates.family;
          if (updates.plusOneAllowed !== undefined)
            data.plusOneAllowed = updates.plusOneAllowed;
          if (updates.dietaryRestrictions !== undefined)
            data.dietaryRestrictions = updates.dietaryRestrictions;
          if (updates.notes !== undefined) data.notes = updates.notes;

          if (Object.keys(data).length === 0) {
            return { success: false, error: "No fields to update" };
          }

          const guest = await db.guest.update({
            where: { id: guestId, weddingId },
            data,
          });

          return {
            success: true,
            guest: {
              id: guest.id,
              name: `${guest.firstName} ${guest.lastName || ""}`.trim(),
              email: guest.email,
              side: guest.side,
              list: guest.list,
            },
          };
        } catch (error) {
          console.error("Error in updateGuest tool:", error);
          return { success: false, error: "Guest not found or update failed" };
        }
      },
    }),

    deleteGuest: tool({
      description:
        "Delete a guest permanently. ALWAYS confirm with the user before calling — this cannot be undone.",
      inputSchema: z.object({
        guestId: z.string().describe("The guest ID to delete"),
      }),
      execute: async ({ guestId }) => {
        try {
          const guest = await db.guest.findFirst({
            where: { id: guestId, weddingId },
          });

          if (!guest) {
            return { success: false, error: "Guest not found" };
          }

          // Scope the delete by weddingId too (defense-in-depth, consistent
          // with updateGuest) so it can never act outside this wedding.
          await db.guest.deleteMany({ where: { id: guestId, weddingId } });

          return {
            success: true,
            deleted: `${guest.firstName} ${guest.lastName || ""}`.trim(),
          };
        } catch (error) {
          console.error("Error in deleteGuest tool:", error);
          return { success: false, error: "Failed to delete guest" };
        }
      },
    }),

    addTodo: tool({
      description: "Add a wedding todo item to the couple's task list.",
      inputSchema: z.object({
        title: z.string().describe("The todo item title"),
      }),
      execute: async ({ title }) => {
        try {
          const maxOrder = await db.weddingTodo.aggregate({
            where: { weddingId },
            _max: { displayOrder: true },
          });

          const todo = await db.weddingTodo.create({
            data: {
              weddingId,
              title,
              displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
            },
          });

          return { success: true, todo: { id: todo.id, title: todo.title } };
        } catch (error) {
          console.error("Error in addTodo tool:", error);
          return { success: false, error: "Failed to create todo" };
        }
      },
    }),

    bulkInvite: tool({
      description:
        "Send invitation emails to multiple guests at once, filtered by list tier and/or RSVP status. Always confirm the count with the user before calling.",
      inputSchema: z.object({
        list: z
          .enum(["a", "b", "c"])
          .optional()
          .describe("Filter by list tier"),
        status: z
          .enum(["pending"])
          .optional()
          .describe(
            "Filter by RSVP status (only pending makes sense for invites)",
          ),
        uninvitedOnly: z
          .boolean()
          .optional()
          .describe(
            "If true, only send to guests who haven't been invited yet (numberOfResends = 0)",
          ),
      }),
      execute: async ({ list, status, uninvitedOnly }) => {
        try {
          const where: Record<string, unknown> = {
            weddingId,
            isPlusOne: false,
            email: { not: null },
          };
          if (list) where.list = list;
          if (status) where.rsvpStatus = status;
          if (uninvitedOnly) where.numberOfResends = 0;

          const guests = await db.guest.findMany({ where });

          if (guests.length === 0) {
            return {
              success: true,
              sent: 0,
              message: "No guests match the criteria",
            };
          }

          const settings = await getWeddingSettings();
          const notificationRecipients = getNotificationRecipients(settings);
          if (!getResendClient() || notificationRecipients.length === 0) {
            return { success: false, error: "Email is not configured" };
          }

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

          let sentCount = 0;
          const errors: string[] = [];

          for (const guest of guests) {
            if (!guest.email || !guest.email.includes("@")) continue;

            try {
              const rsvpUrl = `${weddingUrl(settings.slug, "/rsvp")}?code=${guest.inviteCode}`;
              const rendered = await renderEmailTemplate(
                weddingId,
                "wedding_invitation",
                {
                  COUPLE_NAMES: settings.coupleName,
                  GUEST_NAME:
                    `${guest.firstName} ${guest.lastName || ""}`.trim(),
                  INVITE_CODE: guest.inviteCode ?? "",
                  RSVP_URL: rsvpUrl,
                  WEDDING_DATE: weddingDate,
                  VENUE_NAME: venueName,
                  VENUE_ADDRESS: venueAddress,
                  PERSONAL_MESSAGE: "",
                },
                guest.preferredLanguage ?? settings.defaultLanguage,
              );

              if (!rendered) continue;

              const result = await sendEmail({
                from: getEmailFromAddress(settings, "Wedding Invitation"),
                to: guest.email,
                subject: rendered.subject,
                html: rendered.html,
                log: {
                  weddingId,
                  guestId: guest.id,
                  type: "wedding_invitation",
                },
              });

              if (!result.error) {
                sentCount++;
                await db.guest.update({
                  where: { id: guest.id },
                  data: {
                    numberOfResends: (guest.numberOfResends || 0) + 1,
                  },
                });
              }
            } catch (err) {
              errors.push(
                `${guest.firstName}: ${err instanceof Error ? err.message : "unknown error"}`,
              );
            }
          }

          return {
            success: true,
            sent: sentCount,
            total: guests.length,
            errors: errors.length > 0 ? errors : undefined,
          };
        } catch (error) {
          console.error("Error in bulkInvite tool:", error);
          return { success: false, error: "Failed to send bulk invites" };
        }
      },
    }),

    createEvent: tool({
      description:
        "Create a new wedding event. Always confirm the details with the user before calling. If isDefault is true, all existing guests will be automatically invited.",
      inputSchema: z.object({
        name: z.string().describe("Event name (e.g. 'Rehearsal Dinner')"),
        description: z.string().optional().describe("Event description"),
        eventDate: z
          .string()
          .optional()
          .describe("Event date in YYYY-MM-DD format"),
        startTime: z
          .string()
          .optional()
          .describe("Start time in HH:MM format (24h)"),
        endTime: z
          .string()
          .optional()
          .describe("End time in HH:MM format (24h)"),
        locationName: z.string().optional().describe("Venue name"),
        locationAddress: z.string().optional().describe("Full address"),
        isDefault: z
          .boolean()
          .optional()
          .describe("If true, all guests are auto-invited to this event"),
      }),
      execute: async ({
        name,
        description,
        eventDate,
        startTime,
        endTime,
        locationName,
        locationAddress,
        isDefault,
      }) => {
        try {
          const maxOrder = await db.event.aggregate({
            where: { weddingId },
            _max: { displayOrder: true },
          });

          const event = await db.event.create({
            data: {
              weddingId,
              name,
              description: description ?? null,
              eventDate: eventDate ? new Date(`${eventDate}T00:00:00Z`) : null,
              startTime: startTime
                ? new Date(`1970-01-01T${startTime}:00Z`)
                : null,
              endTime: endTime ? new Date(`1970-01-01T${endTime}:00Z`) : null,
              locationName: locationName ?? null,
              locationAddress: locationAddress ?? null,
              isDefault: isDefault ?? false,
              displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
            },
          });

          // If default event, auto-invite all guests
          if (isDefault) {
            const guests = await db.guest.findMany({
              where: { weddingId },
              select: { id: true },
            });
            if (guests.length > 0) {
              await db.guestEventInvite.createMany({
                data: guests.map((g) => ({
                  guestId: g.id,
                  eventId: event.id,
                  weddingId,
                })),
                skipDuplicates: true,
              });
            }
          }

          return {
            success: true,
            event: {
              id: event.id,
              name: event.name,
              eventDate: eventDate ?? null,
              startTime: startTime ?? null,
              endTime: endTime ?? null,
              locationName: event.locationName,
              locationAddress: event.locationAddress,
              isDefault: event.isDefault,
            },
          };
        } catch (error) {
          console.error("Error in createEvent tool:", error);
          return { success: false, error: "Failed to create event" };
        }
      },
    }),
  };
}
