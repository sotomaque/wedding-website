"use client";

/**
 * Per-template wedding icon sets.
 *
 * Lives in a separate "use client" module from motifs.tsx because Phosphor's
 * `IconContext` calls `createContext` at module load and can't be evaluated in
 * a React Server Component context. Section components that consume icons
 * (e.g. ElegantScheduleSection) must themselves opt into "use client".
 *
 * The motif SVG dividers in motifs.tsx stay server-renderable — only the
 * Phosphor-backed icon plumbing crosses the client boundary.
 */

import {
  Calendar,
  Camera,
  EnvelopeSimple,
  Flower,
  FlowerTulip,
  Gift,
  Handshake,
  Heart,
  type Icon,
  type IconWeight,
  MapPin,
} from "@phosphor-icons/react";

/**
 * Note: Phosphor 2.1.10 does not ship a `Ring` glyph; `Handshake` substitutes
 * for ceremony/vows until an alternate icon source fills the gap.
 */
export interface IconSet {
  weight: IconWeight;
  schedule: { date: Icon; location: Icon };
  story: { heart: Icon };
  ceremony: { union: Icon };
  registry: { gift: Icon };
  gallery: { camera: Icon };
  rsvp: { envelope: Icon };
  flourish: Icon;
}

const DEFAULT_ICON_SET: IconSet = {
  weight: "regular",
  schedule: { date: Calendar, location: MapPin },
  story: { heart: Heart },
  ceremony: { union: Handshake },
  registry: { gift: Gift },
  gallery: { camera: Camera },
  rsvp: { envelope: EnvelopeSimple },
  flourish: Flower,
};

const FLORAL_ROSES_ICON_SET: IconSet = {
  ...DEFAULT_ICON_SET,
  weight: "light",
  flourish: FlowerTulip,
};

const ICON_SETS: Record<string, IconSet> = {
  "floral-roses": FLORAL_ROSES_ICON_SET,
};

/**
 * Resolve the icon set for a given motif id. Returns `DEFAULT_ICON_SET` for
 * `null` / unknown ids so consumers can render without null-guarding.
 */
export function getIconSet(motifId: string | null | undefined): IconSet {
  if (!motifId) return DEFAULT_ICON_SET;
  return ICON_SETS[motifId] ?? DEFAULT_ICON_SET;
}
