import { describe, expect, it } from "bun:test";
import { buildHeadcountWhere, describeHeadcount } from "@/lib/headcount";
import {
  type HeadcountConfig,
  headcountConfigSchema,
} from "@/lib/validations/wedding-content";

// Build a config from a partial, filling the rest with schema defaults — mirrors
// how the data layer parses the stored JSON blob.
function config(overrides: Partial<HeadcountConfig> = {}): HeadcountConfig {
  return headcountConfigSchema.parse(overrides);
}

const WEDDING_ID = "wedding-1";

describe("headcountConfigSchema defaults", () => {
  it("resolves an empty blob to count-every-accepted-guest", () => {
    const parsed = headcountConfigSchema.parse({});
    expect(parsed).toEqual({
      label: "Accepted RSVPs",
      includedLists: ["a", "b", "c"],
      excludeThreeAndUnder: false,
      excludeUnder21: false,
    });
  });

  it("rejects unknown list values", () => {
    expect(
      headcountConfigSchema.safeParse({ includedLists: ["a", "d"] }).success,
    ).toBe(false);
  });
});

describe("buildHeadcountWhere", () => {
  it("scopes to the wedding and accepted RSVPs by default (no list filter)", () => {
    expect(buildHeadcountWhere(WEDDING_ID, config())).toEqual({
      weddingId: WEDDING_ID,
      rsvpStatus: "yes",
    });
  });

  it("constrains by list only when the selection is narrowed", () => {
    const where = buildHeadcountWhere(
      WEDDING_ID,
      config({ includedLists: ["a", "b"] }),
    );
    expect(where.list).toEqual({ in: ["a", "b"] });
  });

  it("yields a list filter for a single list", () => {
    const where = buildHeadcountWhere(
      WEDDING_ID,
      config({ includedLists: ["a"] }),
    );
    expect(where.list).toEqual({ in: ["a"] });
  });

  it("an empty list selection filters to none (count zero)", () => {
    const where = buildHeadcountWhere(
      WEDDING_ID,
      config({ includedLists: [] }),
    );
    expect(where.list).toEqual({ in: [] });
  });

  it("excludes three-and-under when requested", () => {
    const where = buildHeadcountWhere(
      WEDDING_ID,
      config({ excludeThreeAndUnder: true }),
    );
    expect(where.threeAndUnder).toBe(false);
    expect(where.under21).toBeUndefined();
  });

  it("excludes under-21 when requested", () => {
    const where = buildHeadcountWhere(
      WEDDING_ID,
      config({ excludeUnder21: true }),
    );
    expect(where.under21).toBe(false);
  });

  it("combines list + age exclusions", () => {
    const where = buildHeadcountWhere(
      WEDDING_ID,
      config({
        includedLists: ["a"],
        excludeThreeAndUnder: true,
        excludeUnder21: true,
      }),
    );
    expect(where).toEqual({
      weddingId: WEDDING_ID,
      rsvpStatus: "yes",
      list: { in: ["a"] },
      threeAndUnder: false,
      under21: false,
    });
  });
});

describe("describeHeadcount", () => {
  it("falls back to 'accepted' with no narrowing", () => {
    expect(describeHeadcount(config())).toBe("accepted");
  });

  it("summarizes narrowed lists", () => {
    expect(describeHeadcount(config({ includedLists: ["a", "b"] }))).toBe(
      "A/B-list",
    );
  });

  it("reports no lists selected", () => {
    expect(describeHeadcount(config({ includedLists: [] }))).toBe("no lists");
  });

  it("joins multiple active criteria", () => {
    expect(
      describeHeadcount(
        config({
          includedLists: ["a"],
          excludeThreeAndUnder: true,
          excludeUnder21: true,
        }),
      ),
    ).toBe("A-list · excl. 3 & under · excl. under 21");
  });
});
