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

// Database interface
export interface Database {
  guests: GuestsTable;
  activities: ActivitiesTable;
  guest_activity_interests: GuestActivityInterestsTable;
  photos: PhotosTable;
}
