import type { WeddingContext } from "@/lib/db/wedding-context";

export type AIFeature =
  | "todo-generator"
  | "story-writer"
  | "email-draft"
  | "seating-chart"
  | "photo-captions"
  | "rsvp-insights"
  | "budget-optimizer"
  | "vendor-recommendations"
  | "planning-assistant"
  | "timeline-generator";

export interface AIRequestContext {
  weddingId: string;
  weddingContext?: WeddingContext;
  feature: AIFeature;
  temperature?: number;
  maxTokens?: number;
}

export type AIResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
