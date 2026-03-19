/**
 * Database type definitions for Supabase
 * These types match the SQL schema defined in supabase-schema.sql
 */

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
          activities_email_sent: boolean;
          activities_email_sent_at: string | null;
          activities_email_resend_count: number;
          calendar_invite_sent: boolean;
          calendar_invite_sent_at: Date | string | null;
          calendar_invite_resend_count: number;
          party_id: string | null;
          arrival_date: string | null;
          arrival_transport: string | null;
          departure_date: string | null;
          departure_transport: string | null;
          accommodation_notes: string | null;
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
          three_and_under?: boolean;
          notes?: string | null;
          clerk_user_id?: string | null;
          gender?: "male" | "female" | null;
          bridal_party_role?:
            | "groomsman"
            | "best_man"
            | "bridesmaid"
            | "maid_of_honor"
            | null;
          activities_email_sent?: boolean;
          activities_email_sent_at?: string | null;
          activities_email_resend_count?: number;
          calendar_invite_sent?: boolean;
          calendar_invite_sent_at?: string | null;
          calendar_invite_resend_count?: number;
          party_id?: string | null;
          arrival_date?: string | null;
          arrival_transport?: string | null;
          departure_date?: string | null;
          departure_transport?: string | null;
          accommodation_notes?: string | null;
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
          three_and_under?: boolean;
          notes?: string | null;
          clerk_user_id?: string | null;
          gender?: "male" | "female" | null;
          bridal_party_role?:
            | "groomsman"
            | "best_man"
            | "bridesmaid"
            | "maid_of_honor"
            | null;
          activities_email_sent?: boolean;
          activities_email_sent_at?: string | null;
          activities_email_resend_count?: number;
          calendar_invite_sent?: boolean;
          calendar_invite_sent_at?: string | null;
          calendar_invite_resend_count?: number;
          party_id?: string | null;
          arrival_date?: string | null;
          arrival_transport?: string | null;
          departure_date?: string | null;
          departure_transport?: string | null;
          accommodation_notes?: string | null;
          created_at?: string;
        };
      };
      parties: {
        Row: {
          id: string;
          invite_code: string;
          name: string | null;
          side: "bride" | "groom" | "both" | null;
          list: "a" | "b" | "c" | null;
          family: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invite_code: string;
          name?: string | null;
          side?: "bride" | "groom" | "both" | null;
          list?: "a" | "b" | "c" | null;
          family?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invite_code?: string;
          name?: string | null;
          side?: "bride" | "groom" | "both" | null;
          list?: "a" | "b" | "c" | null;
          family?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          link?: string | null;
          emoji?: string | null;
          address?: string | null;
          image_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_venue?: boolean;
          venue_type?: "ceremony" | "reception" | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          link?: string | null;
          emoji?: string | null;
          address?: string | null;
          image_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_venue?: boolean;
          venue_type?: "ceremony" | "reception" | null;
          display_order?: number;
          created_at?: string;
        };
      };
      guest_activity_interests: {
        Row: {
          id: string;
          guest_id: string;
          activity_id: string;
          invite_code: string;
          planned_date: string | null;
          status: "interested" | "committed";
          created_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          activity_id: string;
          invite_code: string;
          planned_date?: string | null;
          status?: "interested" | "committed";
          created_at?: string;
        };
        Update: {
          id?: string;
          guest_id?: string;
          activity_id?: string;
          invite_code?: string;
          planned_date?: string | null;
          status?: "interested" | "committed";
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
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          event_date: string | null;
          start_time: string | null;
          end_time: string | null;
          location_name: string | null;
          location_address: string | null;
          latitude: number | null;
          longitude: number | null;
          is_default: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          event_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          event_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          display_order?: number;
          created_at?: string;
        };
      };
      guest_event_invites: {
        Row: {
          id: string;
          guest_id: string;
          event_id: string;
          rsvp_status: "pending" | "yes" | "no";
          email_sent: boolean;
          email_sent_at: string | null;
          email_resend_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          event_id: string;
          rsvp_status?: "pending" | "yes" | "no";
          email_sent?: boolean;
          email_sent_at?: string | null;
          email_resend_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          guest_id?: string;
          event_id?: string;
          rsvp_status?: "pending" | "yes" | "no";
          email_sent?: boolean;
          email_sent_at?: string | null;
          email_resend_count?: number;
          created_at?: string;
        };
      };
      seating_charts: {
        Row: {
          id: string;
          name: string;
          default_seats_per_table: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          default_seats_per_table?: number;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          default_seats_per_table?: number;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      seating_tables: {
        Row: {
          id: string;
          seating_chart_id: string;
          table_number: number;
          table_name: string | null;
          capacity_override: number | null;
          position_x: number;
          position_y: number;
          shape: "round" | "rectangle" | "square";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seating_chart_id: string;
          table_number: number;
          table_name?: string | null;
          capacity_override?: number | null;
          position_x?: number;
          position_y?: number;
          shape?: "round" | "rectangle" | "square";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          seating_chart_id?: string;
          table_number?: number;
          table_name?: string | null;
          capacity_override?: number | null;
          position_x?: number;
          position_y?: number;
          shape?: "round" | "rectangle" | "square";
          notes?: string | null;
          created_at?: string;
        };
      };
      guest_table_assignments: {
        Row: {
          id: string;
          seating_table_id: string;
          guest_id: string;
          seat_number: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seating_table_id: string;
          guest_id: string;
          seat_number?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          seating_table_id?: string;
          guest_id?: string;
          seat_number?: number | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          wedding_id: string | null;
          title: string;
          description: string | null;
          file_url: string;
          file_type: string;
          file_size: number | null;
          category:
            | "contract"
            | "receipt"
            | "floor_plan"
            | "timeline"
            | "other";
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wedding_id?: string | null;
          title: string;
          description?: string | null;
          file_url: string;
          file_type: string;
          file_size?: number | null;
          category?:
            | "contract"
            | "receipt"
            | "floor_plan"
            | "timeline"
            | "other";
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string | null;
          title?: string;
          description?: string | null;
          file_url?: string;
          file_type?: string;
          file_size?: number | null;
          category?:
            | "contract"
            | "receipt"
            | "floor_plan"
            | "timeline"
            | "other";
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_links: {
        Row: {
          id: string;
          wedding_id: string | null;
          title: string;
          url: string;
          description: string | null;
          category:
            | "venue"
            | "catering"
            | "photography"
            | "music"
            | "flowers"
            | "other";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wedding_id?: string | null;
          title: string;
          url: string;
          description?: string | null;
          category?:
            | "venue"
            | "catering"
            | "photography"
            | "music"
            | "flowers"
            | "other";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string | null;
          title?: string;
          url?: string;
          description?: string | null;
          category?:
            | "venue"
            | "catering"
            | "photography"
            | "music"
            | "flowers"
            | "other";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
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
