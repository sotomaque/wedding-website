import type { ServiceLinkCategory } from "./actions";

export const CATEGORIES: { value: ServiceLinkCategory; label: string }[] = [
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "photography", label: "Photography" },
  { value: "music", label: "Music / DJ" },
  { value: "flowers", label: "Flowers" },
  { value: "other", label: "Other" },
];

export const CATEGORY_COLORS: Record<ServiceLinkCategory, string> = {
  venue: "bg-amber-100 text-amber-800",
  catering: "bg-green-100 text-green-800",
  photography: "bg-blue-100 text-blue-800",
  music: "bg-purple-100 text-purple-800",
  flowers: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

export function getFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}
