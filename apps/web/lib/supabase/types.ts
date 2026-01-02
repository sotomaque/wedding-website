/**
 * Database type definitions for Supabase
 * These types match the SQL schema defined in supabase-schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      guests: {
        Row: {
          id: string;
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
          preferred_contact_method:
            | "email"
            | "text"
            | "whatsapp"
            | "phone_call"
            | null;
          family: boolean;
          under_21: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name?: string | null;
          email?: string | null;
          invite_code: string;
          rsvp_status?: "pending" | "yes" | "no";
          plus_one_allowed?: boolean;
          dietary_restrictions?: string | null;
          side?: "bride" | "groom" | "both" | null;
          list?: "a" | "b" | "c";
          is_plus_one?: boolean;
          primary_guest_id?: string | null;
          number_of_resends?: number;
          mailing_address?: string | null;
          physical_invite_sent?: boolean;
          phone_number?: string | null;
          whatsapp?: string | null;
          preferred_contact_method?:
            | "email"
            | "text"
            | "whatsapp"
            | "phone_call"
            | null;
          family?: boolean;
          under_21?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string | null;
          email?: string | null;
          invite_code?: string;
          rsvp_status?: "pending" | "yes" | "no";
          plus_one_allowed?: boolean;
          dietary_restrictions?: string | null;
          side?: "bride" | "groom" | "both" | null;
          list?: "a" | "b" | "c";
          is_plus_one?: boolean;
          primary_guest_id?: string | null;
          number_of_resends?: number;
          mailing_address?: string | null;
          physical_invite_sent?: boolean;
          phone_number?: string | null;
          whatsapp?: string | null;
          preferred_contact_method?:
            | "email"
            | "text"
            | "whatsapp"
            | "phone_call"
            | null;
          family?: boolean;
          under_21?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          name: string;
          description: string;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          link?: string | null;
          created_at?: string;
        };
      };
      guest_activity_interests: {
        Row: {
          id: string;
          guest_id: string;
          activity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          activity_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          guest_id?: string;
          activity_id?: string;
          created_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          url: string;
          alt: string;
          description: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          alt: string;
          description?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          alt?: string;
          description?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
