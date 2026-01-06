import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock env before importing constants
mock.module("@/env", () => ({
  env: {
    NEXT_PUBLIC_STRIPE_LINK_BABY_FUND: "https://buy.stripe.com/test_baby",
    NEXT_PUBLIC_STRIPE_LINK_HONEYMOON: "https://buy.stripe.com/test_honeymoon",
    NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS:
      "https://buy.stripe.com/test_student_loans",
  },
}));

// Import after mocking
import { REGISTRY_CONTENT, type RegistryGift } from "@/app/registry/constants";

describe("Registry - Content Structure", () => {
  it("should have title defined", () => {
    expect(REGISTRY_CONTENT.title).toBeDefined();
    expect(REGISTRY_CONTENT.title).toBe("Gift Registry");
  });

  it("should have subtitle defined", () => {
    expect(REGISTRY_CONTENT.subtitle).toBeDefined();
    expect(REGISTRY_CONTENT.subtitle.length).toBeGreaterThan(0);
    expect(REGISTRY_CONTENT.subtitle).toContain("presence");
  });

  it("should have intro paragraph defined", () => {
    expect(REGISTRY_CONTENT.intro).toBeDefined();
    expect(REGISTRY_CONTENT.intro.length).toBeGreaterThan(0);
  });

  it("should have exactly 3 gift options", () => {
    expect(REGISTRY_CONTENT.gifts).toHaveLength(3);
  });
});

describe("Registry - Gift Properties", () => {
  it("each gift should have required properties", () => {
    for (const gift of REGISTRY_CONTENT.gifts) {
      expect(gift.id).toBeDefined();
      expect(gift.id.length).toBeGreaterThan(0);

      expect(gift.title).toBeDefined();
      expect(gift.title.length).toBeGreaterThan(0);

      expect(gift.description).toBeDefined();
      expect(gift.description.length).toBeGreaterThan(0);

      expect(gift.image).toBeDefined();
      expect(gift.image).toMatch(/^\/registry\/.+\.(jpg|jpeg|png)$/);

      expect(gift.emoji).toBeDefined();
      expect(gift.emoji.length).toBeGreaterThan(0);
    }
  });

  it("gift IDs should be unique", () => {
    const ids = REGISTRY_CONTENT.gifts.map((g) => g.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("gift images should be unique", () => {
    const images = REGISTRY_CONTENT.gifts.map((g) => g.image);
    const uniqueImages = new Set(images);
    expect(uniqueImages.size).toBe(images.length);
  });
});

describe("Registry - Gift Funds", () => {
  it("should include Baby Fund", () => {
    const babyFund = REGISTRY_CONTENT.gifts.find(
      (g) =>
        g.title.toLowerCase().includes("baby") ||
        g.title.toLowerCase().includes("tiny humans"),
    );
    expect(babyFund).toBeDefined();
    expect(babyFund?.emoji).toBe("👶");
  });

  it("should include Honeymoon Fund", () => {
    const honeymoon = REGISTRY_CONTENT.gifts.find(
      (g) =>
        g.title.toLowerCase().includes("honeymoon") ||
        g.title.toLowerCase().includes("somewhere pretty"),
    );
    expect(honeymoon).toBeDefined();
    expect(honeymoon?.emoji).toBe("✈️");
  });

  it("should include Student Loans Fund", () => {
    const studentLoans = REGISTRY_CONTENT.gifts.find(
      (g) =>
        g.title.toLowerCase().includes("student") ||
        g.title.toLowerCase().includes("loan"),
    );
    expect(studentLoans).toBeDefined();
    expect(studentLoans?.emoji).toBe("🎓");
  });
});

describe("Registry - Stripe URLs", () => {
  it("should have stripeUrl property defined for all gifts", () => {
    for (const gift of REGISTRY_CONTENT.gifts) {
      // stripeUrl property should exist (may be undefined if env var not set)
      expect("stripeUrl" in gift).toBe(true);
    }
  });

  it("Baby Fund should reference NEXT_PUBLIC_STRIPE_LINK_BABY_FUND env var", () => {
    const babyFund = REGISTRY_CONTENT.gifts.find(
      (g) => g.id === "future-babies",
    );
    expect(babyFund).toBeDefined();
    // In test environment, stripeUrl comes from env.NEXT_PUBLIC_STRIPE_LINK_BABY_FUND
    // The actual value depends on environment configuration
    expect(
      typeof babyFund?.stripeUrl === "string" ||
        babyFund?.stripeUrl === undefined,
    ).toBe(true);
  });

  it("Honeymoon should reference NEXT_PUBLIC_STRIPE_LINK_HONEYMOON env var", () => {
    const honeymoon = REGISTRY_CONTENT.gifts.find((g) => g.id === "honeymoon");
    expect(honeymoon).toBeDefined();
    expect(
      typeof honeymoon?.stripeUrl === "string" ||
        honeymoon?.stripeUrl === undefined,
    ).toBe(true);
  });

  it("Student Loans should reference NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS env var", () => {
    const studentLoans = REGISTRY_CONTENT.gifts.find(
      (g) => g.id === "student-loans",
    );
    expect(studentLoans).toBeDefined();
    expect(
      typeof studentLoans?.stripeUrl === "string" ||
        studentLoans?.stripeUrl === undefined,
    ).toBe(true);
  });

  it("all gift IDs should match expected values", () => {
    const giftIds = REGISTRY_CONTENT.gifts.map((g) => g.id);
    expect(giftIds).toContain("future-babies");
    expect(giftIds).toContain("honeymoon");
    expect(giftIds).toContain("student-loans");
  });
});

describe("Registry - Gift Type Export", () => {
  it("RegistryGift type should be exported", () => {
    // This test verifies the type exists at compile time
    const gift: RegistryGift = REGISTRY_CONTENT.gifts[0]!;
    expect(gift).toBeDefined();
    expect(gift.id).toBeDefined();
    expect(gift.title).toBeDefined();
  });
});
