import { describe, expect, it } from "bun:test";
import {
  buildExportMatrix,
  DEFAULT_EXPORT_COLUMN_KEYS,
  type ExportGuest,
  GUEST_EXPORT_COLUMNS,
  normalizeColumnKeys,
} from "@/lib/export/guest-columns";
import { buildGuestExportWhere } from "@/lib/export/guest-filter";
import { parseRecipients } from "@/lib/export/schema";
import { exportFilename, toCsv, toXlsx } from "@/lib/export/serialize";

const WEDDING_ID = "wedding-1";

// Minimal guest factory — only the fields the column accessors touch matter;
// the rest are cast away since the catalog never reads them.
function guest(overrides: Partial<ExportGuest> = {}): ExportGuest {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phoneNumber: null,
    whatsapp: null,
    side: "bride",
    party: null,
    list: "a",
    rsvpStatus: "yes",
    isPlusOne: false,
    plusOneAllowed: true,
    family: false,
    gender: "female",
    under21: false,
    threeAndUnder: false,
    bridalPartyRole: null,
    dietaryRestrictions: null,
    mailingAddress: null,
    preferredContactMethod: null,
    notes: null,
    inviteCode: "ABC123",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  } as ExportGuest;
}

describe("buildExportMatrix", () => {
  it("emits a header + cells for the selected columns in catalog order", () => {
    const matrix = buildExportMatrix(
      [guest()],
      ["rsvpStatus", "name"], // intentionally out of catalog order
    );
    // catalog order is name before rsvpStatus
    expect(matrix.header).toEqual(["Name", "RSVP Status"]);
    expect(matrix.rows).toEqual([["Ada Lovelace", "Accepted"]]);
  });

  it("renders booleans, enums, party name, and dates as friendly strings", () => {
    const matrix = buildExportMatrix(
      [
        guest({
          isPlusOne: true,
          threeAndUnder: true,
          side: "groom",
          list: "b",
          rsvpStatus: "no",
          gender: "male",
          bridalPartyRole: "best_man",
          party: { name: "Smith Family" } as ExportGuest["party"],
        }),
      ],
      [
        "side",
        "party",
        "list",
        "rsvpStatus",
        "isPlusOne",
        "gender",
        "threeAndUnder",
        "bridalPartyRole",
        "createdAt",
      ],
    );
    expect(matrix.rows[0]).toEqual([
      "Groom",
      "Smith Family",
      "B",
      "Declined",
      "Yes",
      "Male",
      "Yes",
      "Best Man",
      "2026-01-15",
    ]);
  });

  it("falls back to the default set (no Invite Code) when no valid column is selected", () => {
    const matrix = buildExportMatrix([guest()], ["bogus"]);
    expect(matrix.header).toHaveLength(DEFAULT_EXPORT_COLUMN_KEYS.length);
    expect(matrix.header).not.toContain("Invite Code");
  });

  it("excludes inviteCode from the default columns but allows opting in", () => {
    // Not in the default selection.
    expect(DEFAULT_EXPORT_COLUMN_KEYS).not.toContain("inviteCode");
    const def = buildExportMatrix([guest()], DEFAULT_EXPORT_COLUMN_KEYS);
    expect(def.header).not.toContain("Invite Code");
    // Still available when explicitly requested.
    const optIn = buildExportMatrix([guest()], ["name", "inviteCode"]);
    expect(optIn.header).toEqual(["Name", "Invite Code"]);
    expect(optIn.rows[0]).toEqual(["Ada Lovelace", "ABC123"]);
  });

  it("renders empty strings for null values", () => {
    const matrix = buildExportMatrix(
      [guest({ email: null, notes: null })],
      ["email", "notes"],
    );
    expect(matrix.rows[0]).toEqual(["", ""]);
  });
});

describe("normalizeColumnKeys", () => {
  it("returns the default set when undefined or empty", () => {
    expect(normalizeColumnKeys(undefined)).toEqual(DEFAULT_EXPORT_COLUMN_KEYS);
    expect(normalizeColumnKeys([])).toEqual(DEFAULT_EXPORT_COLUMN_KEYS);
  });

  it("drops unknown keys but keeps valid ones", () => {
    expect(normalizeColumnKeys(["name", "nope", "email"])).toEqual([
      "name",
      "email",
    ]);
  });

  it("falls back to defaults when every key is unknown", () => {
    expect(normalizeColumnKeys(["nope"])).toEqual(DEFAULT_EXPORT_COLUMN_KEYS);
  });
});

describe("toCsv", () => {
  it("prefixes a BOM and joins with CRLF", () => {
    const csv = toCsv({ header: ["A", "B"], rows: [["1", "2"]] });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿A,B\r\n1,2");
  });

  it("quotes fields containing commas, quotes, and newlines", () => {
    const csv = toCsv({
      header: ["Name", "Notes"],
      rows: [
        ["Smith, John", 'has "quotes"'],
        ["plain", "line\nbreak"],
      ],
    });
    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain('"has ""quotes"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it("neutralizes formula-injection cells with a leading quote", () => {
    const csv = toCsv({
      header: ["Name"],
      rows: [
        ['=HYPERLINK("http://evil","x")'],
        ["+1+2"],
        ["-cmd"],
        ["@SUM(A1)"],
        ["normal"],
      ],
    });
    // Leading =,+,-,@ get a ' prefix; the = row also has a comma so it's quoted.
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csv).toContain("'+1+2");
    expect(csv).toContain("'-cmd");
    expect(csv).toContain("'@SUM(A1)");
    // A safe value is untouched.
    expect(csv).toContain("\r\nnormal");
  });
});

describe("toXlsx", () => {
  it("produces a non-empty XLSX (zip) buffer", async () => {
    const bytes = await toXlsx({ header: ["A"], rows: [["1"]] });
    expect(bytes.length).toBeGreaterThan(0);
    // XLSX files are zip archives — first two bytes are "PK".
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});

describe("exportFilename", () => {
  it("builds a dated, sanitized filename", () => {
    const name = exportFilename("Helen & Enrique", "csv");
    expect(name).toMatch(/^guest-list-helenenrique-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("buildGuestExportWhere", () => {
  it("scopes to the wedding with no RSVP filter by default", () => {
    expect(buildGuestExportWhere(WEDDING_ID)).toEqual({
      weddingId: WEDDING_ID,
    });
  });

  it("maps 'responded' to accepted-or-declined", () => {
    expect(
      buildGuestExportWhere(WEDDING_ID, { rsvpStatus: "responded" }),
    ).toEqual({ weddingId: WEDDING_ID, rsvpStatus: { in: ["yes", "no"] } });
  });

  it("passes through a single status and other filters", () => {
    expect(
      buildGuestExportWhere(WEDDING_ID, {
        rsvpStatus: "yes",
        side: "bride",
        list: "a",
        threeAndUnder: false,
      }),
    ).toEqual({
      weddingId: WEDDING_ID,
      rsvpStatus: "yes",
      side: "bride",
      list: "a",
      threeAndUnder: false,
    });
  });

  it("ignores 'all'", () => {
    expect(buildGuestExportWhere(WEDDING_ID, { rsvpStatus: "all" })).toEqual({
      weddingId: WEDDING_ID,
    });
  });
});

describe("parseRecipients", () => {
  it("splits, trims, and validates emails", () => {
    const { emails, invalid } = parseRecipients(
      " planner@example.com , venue@example.com ",
    );
    expect(emails).toEqual(["planner@example.com", "venue@example.com"]);
    expect(invalid).toEqual([]);
  });

  it("collects invalid addresses separately", () => {
    const { emails, invalid } = parseRecipients(
      "good@example.com, not-an-email",
    );
    expect(emails).toEqual(["good@example.com"]);
    expect(invalid).toEqual(["not-an-email"]);
  });

  it("ignores empty segments", () => {
    const { emails } = parseRecipients("a@b.com,, ,c@d.com");
    expect(emails).toEqual(["a@b.com", "c@d.com"]);
  });
});
