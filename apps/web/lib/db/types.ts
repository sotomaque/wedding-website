/**
 * Kysely Database Type Definitions
 * These types are derived from the Supabase schema and represent the actual database structure
 */

import type { ColumnType, Generated } from "kysely";

// Weddings table (top-level multi-tenancy entity)
export interface WeddingsTable {
  id: Generated<string>;
  slug: string;
  couple_name: string;
  wedding_date: string;
  rsvp_deadline: string | null;
  timezone: string;
  status: "draft" | "published" | "archived";
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// Guests table
export interface GuestsTable {
  id: Generated<string>;
  first_name: string;
  last_name: string | null;
  email: string | null;
  invite_code: string;
  rsvp_status: "pending" | "yes" | "no";
  plus_one_allowed: boolean;
  dietary_restrictions: string | null;
  side: "bride" | "groom" | "both" | null;
  list: "a" | "b" | "c";
  is_plus_one: boolean;
  primary_guest_id: string | null;
  number_of_resends: number;
  mailing_address: string | null;
  physical_invite_sent: boolean;
  phone_number: string | null;
  whatsapp: string | null;
  preferred_contact_method: "email" | "text" | "whatsapp" | "phone_call" | null;
  family: boolean;
  under_21: boolean;
  three_and_under: boolean;
  notes: string | null;
  clerk_user_id: string | null;
  gender: "male" | "female" | null;
  bridal_party_role:
    | "groomsman"
    | "best_man"
    | "bridesmaid"
    | "maid_of_honor"
    | null;
  activities_email_sent: ColumnType<boolean, boolean | undefined, boolean>;
  activities_email_sent_at: ColumnType<
    Date,
    string | undefined,
    string | undefined
  > | null;
  activities_email_resend_count: ColumnType<number, number | undefined, number>;
  calendar_invite_sent: ColumnType<boolean, boolean | undefined, boolean>;
  calendar_invite_sent_at: ColumnType<
    Date,
    string | undefined,
    string | undefined
  > | null;
  calendar_invite_resend_count: ColumnType<number, number | undefined, number>;
  party_id: string | null;
  arrival_date: string | null;
  arrival_transport: string | null;
  departure_date: string | null;
  departure_transport: string | null;
  accommodation_notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Activities table
export interface ActivitiesTable {
  id: Generated<string>;
  name: string;
  description: string;
  link: string | null;
  emoji: string | null;
  address: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_venue: boolean;
  venue_type: "ceremony" | "reception" | null;
  display_order: number;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Guest Activity Interests junction table
export interface GuestActivityInterestsTable {
  id: Generated<string>;
  guest_id: string;
  activity_id: string;
  invite_code: string;
  planned_date: ColumnType<Date, string | undefined, string | undefined> | null;
  status: "interested" | "committed";
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Photos table
export interface PhotosTable {
  id: Generated<string>;
  url: string;
  alt: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Events table
// Only name is required; other fields can be filled in once planned
export interface EventsTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  event_date: ColumnType<Date | null, string | null | undefined, string | null>;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  display_order: number;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Guest Event Invites junction table
export interface GuestEventInvitesTable {
  id: Generated<string>;
  guest_id: string;
  event_id: string;
  rsvp_status: ColumnType<
    "pending" | "yes" | "no",
    "pending" | "yes" | "no" | undefined,
    "pending" | "yes" | "no"
  >;
  email_sent: ColumnType<boolean, boolean | undefined, boolean>;
  email_sent_at: ColumnType<
    Date,
    string | undefined,
    string | undefined
  > | null;
  email_resend_count: ColumnType<number, number | undefined, number>;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Seating Charts table
export interface SeatingChartsTable {
  id: Generated<string>;
  name: string;
  default_seats_per_table: number;
  is_active: boolean;
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  wedding_id: string | null;
}

// Seating Tables table
export interface SeatingTablesTable {
  id: Generated<string>;
  seating_chart_id: string;
  table_number: number;
  table_name: string | null;
  capacity_override: number | null;
  position_x: number;
  position_y: number;
  shape: "round" | "rectangle" | "square";
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Guest Table Assignments junction table
export interface GuestTableAssignmentsTable {
  id: Generated<string>;
  seating_table_id: string;
  guest_id: string;
  seat_number: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  wedding_id: string | null;
}

// Parties table (groups of guests who attend together)
export interface PartiesTable {
  id: Generated<string>;
  invite_code: string;
  name: string | null;
  side: "bride" | "groom" | "both" | null;
  list: "a" | "b" | "c" | null;
  family: string | null;
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  wedding_id: string | null;
}

// Gifts table (Stripe webhook data)
export interface GiftsTable {
  id: Generated<string>;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_link_id: string | null;
  stripe_charge_id: string | null;
  donor_email: string | null;
  donor_name: string | null;
  amount_cents: number;
  currency: string;
  gift_type: "baby_fund" | "honeymoon" | "student_loans" | null;
  guest_id: string | null;
  status: "pending" | "completed" | "refunded" | "failed";
  thank_you_email_sent: ColumnType<boolean, boolean | undefined, boolean>;
  thank_you_email_sent_at: ColumnType<
    Date,
    string | undefined,
    string | undefined
  > | null;
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  wedding_id: string | null;
}

// Hotels table
export interface HotelsTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  address: string | null;
  website_url: string | null;
  phone: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  hotel_type: "luxury" | "moderate" | "budget" | null;
  distance_to_venue: string | null;
  parking_info: string | null;
  amenities: string | null;
  display_order: ColumnType<number, number | undefined, number>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  wedding_id: string | null;
}

// Guest Hotel Interests junction table
export interface GuestHotelInterestsTable {
  id: Generated<string>;
  guest_id: string;
  hotel_id: string;
  invite_code: string;
  status: "interested" | "booked";
  check_in_date: ColumnType<
    Date,
    string | undefined,
    string | undefined
  > | null;
  check_out_date: ColumnType<
    Date,
    string | undefined,
    string | undefined
  > | null;
  number_of_rooms: number | null;
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  wedding_id: string | null;
}

// Guest Photos table (guest-submitted photos from reception)
export interface GuestPhotosTable {
  id: Generated<string>;
  url: string;
  uploader_name: string | null;
  is_visible: boolean;
  uploaded_at: ColumnType<Date, string | undefined, never>;
  hidden_at: Date | null;
  hidden_by: string | null;
  wedding_id: string | null;
}

// Wedding Todos table
export interface WeddingTodosTable {
  id: Generated<string>;
  title: string;
  is_completed: ColumnType<boolean, boolean | undefined, boolean>;
  display_order: ColumnType<number, number | undefined, number>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  wedding_id: string | null;
}

// Database interface
export interface Database {
  weddings: WeddingsTable;
  guests: GuestsTable;
  activities: ActivitiesTable;
  guest_activity_interests: GuestActivityInterestsTable;
  photos: PhotosTable;
  events: EventsTable;
  guest_event_invites: GuestEventInvitesTable;
  seating_charts: SeatingChartsTable;
  seating_tables: SeatingTablesTable;
  guest_table_assignments: GuestTableAssignmentsTable;
  parties: PartiesTable;
  gifts: GiftsTable;
  hotels: HotelsTable;
  guest_hotel_interests: GuestHotelInterestsTable;
  wedding_todos: WeddingTodosTable;
  guest_photos: GuestPhotosTable;
}
