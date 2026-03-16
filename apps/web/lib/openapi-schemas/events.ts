import { z } from "zod";

export const EventResponse = z.object({
  id: z.string().uuid().describe("Event UUID"),
  name: z.string().describe("Event name"),
  description: z.string().nullable().describe("Event description"),
  event_date: z.string().nullable().describe("Event date (YYYY-MM-DD)"),
  start_time: z.string().nullable().describe("Start time"),
  end_time: z.string().nullable().describe("End time"),
  location_name: z.string().nullable().describe("Venue name"),
  location_address: z.string().nullable().describe("Venue address"),
  latitude: z.number().nullable().describe("Venue latitude"),
  longitude: z.number().nullable().describe("Venue longitude"),
  is_default: z.boolean().describe("Whether all guests are auto-invited"),
  display_order: z.number().describe("Display order"),
  created_at: z.string().describe("Creation timestamp"),
});

export const EventWithCountsResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  event_date: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  location_name: z.string().nullable(),
  location_address: z.string().nullable(),
  is_default: z.boolean(),
  display_order: z.number(),
  inviteCount: z.number().describe("Total invited guests"),
  confirmedCount: z.number().describe("Confirmed guests"),
  declinedCount: z.number().describe("Declined guests"),
});

export const EventListResponse = z.object({
  events: z
    .array(EventWithCountsResponse)
    .describe("List of events with RSVP counts"),
});

export const EventDetailResponse = z.object({
  event: EventWithCountsResponse.describe("Event with RSVP counts"),
});

export const CreateEventBody = z.object({
  name: z.string().describe("Event name (required)"),
  description: z.string().optional().describe("Event description"),
  eventDate: z.string().optional().describe("Event date (YYYY-MM-DD)"),
  startTime: z.string().optional().describe("Start time"),
  endTime: z.string().optional().describe("End time"),
  locationName: z.string().optional().describe("Venue name"),
  locationAddress: z.string().optional().describe("Venue address"),
  latitude: z.number().optional().describe("Venue latitude"),
  longitude: z.number().optional().describe("Venue longitude"),
  isDefault: z.boolean().optional().describe("Auto-invite all guests"),
});

export const CreateEventResponse = z.object({
  event: EventResponse.describe("Created event"),
});

export const UpdateEventBody = z.object({
  name: z.string().optional().describe("Event name"),
  description: z.string().optional().describe("Event description"),
  eventDate: z.string().optional().describe("Event date (YYYY-MM-DD)"),
  startTime: z.string().optional().describe("Start time"),
  endTime: z.string().optional().describe("End time"),
  locationName: z.string().optional().describe("Venue name"),
  locationAddress: z.string().optional().describe("Venue address"),
  latitude: z.number().optional().describe("Venue latitude"),
  longitude: z.number().optional().describe("Venue longitude"),
  isDefault: z.boolean().optional().describe("Auto-invite all guests"),
  displayOrder: z.number().optional().describe("Display order"),
});
