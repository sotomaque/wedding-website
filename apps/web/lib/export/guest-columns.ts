/**
 * Guest export column catalog.
 *
 * Single source of truth for which guest attributes can be exported, their
 * human-readable headers, and how each value is rendered to a flat string for
 * CSV / Excel. Pure and dependency-light so it can be unit-tested without a DB.
 *
 * The wizard lets admins pick a subset of these columns; `buildExportMatrix`
 * turns the selection + guest rows into a header row plus string cells, always
 * preserving the catalog order regardless of the order columns were toggled.
 */

import type { Guest, Party } from "@prisma/client";

/** A guest joined with its (optional) party — the shape the export query loads. */
export type ExportGuest = Guest & { party: Party | null };

export interface GuestExportColumn {
  key: string;
  label: string;
  accessor: (guest: ExportGuest) => string;
}

function yesNo(value: boolean | null | undefined): string {
  return value ? "Yes" : "No";
}

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

const SIDE_LABELS: Record<string, string> = {
  bride: "Bride",
  groom: "Groom",
  both: "Both",
};

const RSVP_LABELS: Record<string, string> = {
  pending: "Pending",
  yes: "Accepted",
  no: "Declined",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
};

const BRIDAL_ROLE_LABELS: Record<string, string> = {
  groomsman: "Groomsman",
  best_man: "Best Man",
  bridesmaid: "Bridesmaid",
  maid_of_honor: "Maid of Honor",
};

const CONTACT_METHOD_LABELS: Record<string, string> = {
  email: "Email",
  text: "Text",
  whatsapp: "WhatsApp",
  phone_call: "Phone Call",
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Full catalog in display order. The order here is the order columns appear in
 * the exported file and in the wizard's column picker.
 */
export const GUEST_EXPORT_COLUMNS: GuestExportColumn[] = [
  {
    key: "name",
    label: "Name",
    accessor: (g) => `${text(g.firstName)} ${text(g.lastName)}`.trim(),
  },
  { key: "email", label: "Email", accessor: (g) => text(g.email) },
  { key: "phoneNumber", label: "Phone", accessor: (g) => text(g.phoneNumber) },
  { key: "whatsapp", label: "WhatsApp", accessor: (g) => text(g.whatsapp) },
  {
    key: "side",
    label: "Side",
    accessor: (g) => (g.side ? (SIDE_LABELS[g.side] ?? g.side) : ""),
  },
  {
    key: "party",
    label: "Party",
    accessor: (g) => text(g.party?.name),
  },
  { key: "list", label: "List", accessor: (g) => g.list.toUpperCase() },
  {
    key: "rsvpStatus",
    label: "RSVP Status",
    accessor: (g) => RSVP_LABELS[g.rsvpStatus] ?? g.rsvpStatus,
  },
  {
    key: "isPlusOne",
    label: "Plus One",
    accessor: (g) => yesNo(g.isPlusOne),
  },
  {
    key: "plusOneAllowed",
    label: "Plus One Allowed",
    accessor: (g) => yesNo(g.plusOneAllowed),
  },
  { key: "family", label: "Family", accessor: (g) => yesNo(g.family) },
  {
    key: "gender",
    label: "Gender",
    accessor: (g) => (g.gender ? (GENDER_LABELS[g.gender] ?? g.gender) : ""),
  },
  {
    key: "under21",
    label: "Under 21",
    accessor: (g) => yesNo(g.under21),
  },
  {
    key: "threeAndUnder",
    label: "3 & Under",
    accessor: (g) => yesNo(g.threeAndUnder),
  },
  {
    key: "bridalPartyRole",
    label: "Bridal Party Role",
    accessor: (g) =>
      g.bridalPartyRole
        ? (BRIDAL_ROLE_LABELS[g.bridalPartyRole] ?? g.bridalPartyRole)
        : "",
  },
  {
    key: "dietaryRestrictions",
    label: "Dietary Restrictions",
    accessor: (g) => text(g.dietaryRestrictions),
  },
  {
    key: "mailingAddress",
    label: "Mailing Address",
    accessor: (g) => text(g.mailingAddress),
  },
  {
    key: "preferredContactMethod",
    label: "Preferred Contact",
    accessor: (g) =>
      g.preferredContactMethod
        ? (CONTACT_METHOD_LABELS[g.preferredContactMethod] ??
          g.preferredContactMethod)
        : "",
  },
  { key: "notes", label: "Notes", accessor: (g) => text(g.notes) },
  {
    key: "inviteCode",
    label: "Invite Code",
    accessor: (g) => text(g.inviteCode),
  },
  {
    key: "createdAt",
    label: "Added On",
    accessor: (g) => formatDate(g.createdAt),
  },
];

/**
 * Columns excluded from the default selection — they must be opted into
 * explicitly. `inviteCode` is the guest's RSVP credential, so it must never
 * land in a default (or emailed) export.
 */
const NON_DEFAULT_COLUMN_KEYS = new Set<string>(["inviteCode"]);

/** Default selection for the wizard — every column except the opt-in ones. */
export const DEFAULT_EXPORT_COLUMN_KEYS: string[] = GUEST_EXPORT_COLUMNS.filter(
  (c) => !NON_DEFAULT_COLUMN_KEYS.has(c.key),
).map((c) => c.key);

const COLUMN_BY_KEY = new Map(GUEST_EXPORT_COLUMNS.map((c) => [c.key, c]));

export interface ExportMatrix {
  header: string[];
  rows: string[][];
}

/**
 * Build a header row + string cell matrix for the selected columns.
 *
 * Selection order is ignored — columns always come out in catalog order so the
 * file layout is stable. Unknown keys are skipped. If no valid column is
 * selected we fall back to the default set (which excludes opt-in columns like
 * inviteCode) so the export is never empty and never silently leaks a token.
 */
export function buildExportMatrix(
  guests: ExportGuest[],
  selectedKeys: string[],
): ExportMatrix {
  const selected = new Set(selectedKeys);
  let columns = GUEST_EXPORT_COLUMNS.filter((c) => selected.has(c.key));
  if (columns.length === 0) {
    columns = GUEST_EXPORT_COLUMNS.filter(
      (c) => !NON_DEFAULT_COLUMN_KEYS.has(c.key),
    );
  }

  return {
    header: columns.map((c) => c.label),
    rows: guests.map((g) => columns.map((c) => c.accessor(g))),
  };
}

/** Validate + normalize a requested column-key list against the catalog. */
export function normalizeColumnKeys(keys: string[] | undefined): string[] {
  if (!keys || keys.length === 0) return [...DEFAULT_EXPORT_COLUMN_KEYS];
  const valid = keys.filter((k) => COLUMN_BY_KEY.has(k));
  return valid.length > 0 ? valid : [...DEFAULT_EXPORT_COLUMN_KEYS];
}
