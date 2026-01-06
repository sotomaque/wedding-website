/**
 * Seating Chart Feature Types
 * Extended types for the seating chart feature with relations and AI integration
 */

import type { Database } from "@/lib/supabase/types";

// Base types from database
export type SeatingChart =
  Database["public"]["Tables"]["seating_charts"]["Row"];
export type SeatingChartInsert =
  Database["public"]["Tables"]["seating_charts"]["Insert"];
export type SeatingChartUpdate =
  Database["public"]["Tables"]["seating_charts"]["Update"];

export type SeatingTable =
  Database["public"]["Tables"]["seating_tables"]["Row"];
export type SeatingTableInsert =
  Database["public"]["Tables"]["seating_tables"]["Insert"];
export type SeatingTableUpdate =
  Database["public"]["Tables"]["seating_tables"]["Update"];

export type GuestTableAssignment =
  Database["public"]["Tables"]["guest_table_assignments"]["Row"];
export type GuestTableAssignmentInsert =
  Database["public"]["Tables"]["guest_table_assignments"]["Insert"];

export type Guest = Database["public"]["Tables"]["guests"]["Row"];

// Extended types with relations
export interface SeatingTableWithGuests extends SeatingTable {
  guests: Guest[];
  assignedCount: number;
  capacity: number;
}

export interface SeatingChartWithTables extends SeatingChart {
  tables: SeatingTableWithGuests[];
  totalAssigned: number;
  totalCapacity: number;
  unassignedGuests: Guest[];
}

// Guest data formatted for AI seating suggestions
export interface GuestForSeating {
  id: string;
  name: string;
  side: "bride" | "groom" | "both" | null;
  family: boolean;
  bridalPartyRole: string | null;
  notes: string | null;
  isPlusOne: boolean;
  primaryGuestId: string | null;
  inviteCode: string;
}

// AI seating assignment for a single table
export interface AISeatingAssignment {
  tableNumber: number;
  guestIds: string[];
  reasoning?: string;
}

// Full AI seating response
export interface AISeatingResponse {
  assignments: AISeatingAssignment[];
  summary: string;
}

// Seating chart statistics
export interface SeatingChartStats {
  totalGuests: number;
  assignedGuests: number;
  unassignedGuests: number;
  totalTables: number;
  totalCapacity: number;
  tablesAtCapacity: number;
}

// Guest filter options for seating chart
export type GuestListFilter = "a" | "b" | "c" | "ab" | "abc";
export type GuestRsvpFilter = "confirmed" | "all";

export interface GuestFilter {
  list: GuestListFilter;
  rsvp: GuestRsvpFilter;
}

export const GUEST_LIST_FILTER_OPTIONS: {
  value: GuestListFilter;
  label: string;
}[] = [
  { value: "a", label: "A-List Only" },
  { value: "b", label: "B-List Only" },
  { value: "c", label: "C-List Only" },
  { value: "ab", label: "A & B List" },
  { value: "abc", label: "All Lists (A, B, C)" },
];

export const GUEST_RSVP_FILTER_OPTIONS: {
  value: GuestRsvpFilter;
  label: string;
}[] = [
  { value: "confirmed", label: "Confirmed Only" },
  { value: "all", label: "All Guests" },
];
