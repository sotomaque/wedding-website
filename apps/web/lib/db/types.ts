/**
 * Kysely Database Type Definitions
 * These types are derived from the Supabase schema and represent the actual database structure
 */

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

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
  side: "bride" | "groom" | null;
  list: "a" | "b";
  is_plus_one: boolean;
  primary_guest_id: string | null;
  number_of_resends: number;
  mailing_address: string | null;
  physical_invite_sent: boolean;
  phone_number: string | null;
  whatsapp: string | null;
  preferred_contact_method: "email" | "text" | "whatsapp" | "phone_call" | null;
  family: boolean;
  notes: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Activities table
export interface ActivitiesTable {
  id: Generated<string>;
  name: string;
  description: string;
  link: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Guest Activity Interests junction table
export interface GuestActivityInterestsTable {
  id: Generated<string>;
  guest_id: string;
  activity_id: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Database interface
export interface Database {
  guests: GuestsTable;
  activities: ActivitiesTable;
  guest_activity_interests: GuestActivityInterestsTable;
}

// Helper types for CRUD operations (available for future use)
type Guest = Selectable<GuestsTable>;
type NewGuest = Insertable<GuestsTable>;
type GuestUpdate = Updateable<GuestsTable>;

type Activity = Selectable<ActivitiesTable>;
type NewActivity = Insertable<ActivitiesTable>;
type ActivityUpdate = Updateable<ActivitiesTable>;

type GuestActivityInterest = Selectable<GuestActivityInterestsTable>;
type NewGuestActivityInterest = Insertable<GuestActivityInterestsTable>;
type GuestActivityInterestUpdate = Updateable<GuestActivityInterestsTable>;

// Suppress unused type warnings - these are intentionally defined for future use
export type {
  Activity,
  ActivityUpdate,
  Guest,
  GuestActivityInterest,
  GuestActivityInterestUpdate,
  GuestUpdate,
  NewActivity,
  NewGuest,
  NewGuestActivityInterest,
};
