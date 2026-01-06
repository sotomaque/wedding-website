/**
 * Kysely Database Type Definitions
 * These types are derived from the Supabase schema and represent the actual database structure
 */

import type { ColumnType, Generated } from "kysely";

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
  created_at: ColumnType<Date, string | undefined, never>;
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
}

// Guest Table Assignments junction table
export interface GuestTableAssignmentsTable {
  id: Generated<string>;
  seating_table_id: string;
  guest_id: string;
  seat_number: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
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
}

// Database interface
export interface Database {
  guests: GuestsTable;
  activities: ActivitiesTable;
  guest_activity_interests: GuestActivityInterestsTable;
  photos: PhotosTable;
  events: EventsTable;
  guest_event_invites: GuestEventInvitesTable;
  seating_charts: SeatingChartsTable;
  seating_tables: SeatingTablesTable;
  guest_table_assignments: GuestTableAssignmentsTable;
  gifts: GiftsTable;
}
