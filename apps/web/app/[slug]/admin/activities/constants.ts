import type { VenueType } from "./actions";

export const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: "ceremony", label: "Ceremony" },
  { value: "reception", label: "Reception" },
];

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  ceremony: "Ceremony",
  reception: "Reception",
};
