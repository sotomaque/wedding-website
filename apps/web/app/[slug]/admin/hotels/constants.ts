import type { HotelType } from "./actions";

export const HOTEL_TYPES: { value: HotelType; label: string }[] = [
  { value: "luxury", label: "Luxury" },
  { value: "moderate", label: "Moderate" },
  { value: "budget", label: "Budget" },
];

export const HOTEL_TYPE_LABELS: Record<HotelType, string> = {
  luxury: "Luxury",
  moderate: "Moderate",
  budget: "Budget",
};

export const HOTEL_TYPE_COLORS: Record<HotelType, string> = {
  luxury: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  moderate: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  budget: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};
