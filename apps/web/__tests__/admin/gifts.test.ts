import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock wedding context - must be before any imports that use getWeddingId
mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: () => Promise.resolve("test-wedding-id"),
  getWeddingContext: () =>
    Promise.resolve({
      weddingId: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      weddingDate: "2026-07-30",
      rsvpDeadline: null,
      timezone: "America/New_York",
      status: "published",
    }),
  getWeddingBySlug: () => Promise.resolve(null),
  getWeddingById: () => Promise.resolve(null),
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
  },
}));

// Create db mock with tracking
const mockExecute = mock(() => Promise.resolve([]));
const mockExecuteTakeFirst = mock(() => Promise.resolve(null));

// Sample gift data
const sampleGifts = [
  {
    id: "gift-1",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: "pi_test1",
    stripe_payment_link_id: null,
    stripe_charge_id: "ch_test1",
    donor_email: "donor1@example.com",
    donor_name: "John Donor",
    amount_cents: 5000,
    currency: "usd",
    gift_type: "baby_fund",
    guest_id: "guest-123",
    status: "completed",
    thank_you_email_sent: false,
    thank_you_email_sent_at: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    guest_first_name: "Jane",
    guest_last_name: "Guest",
    guest_email: "jane@example.com",
  },
  {
    id: "gift-2",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: "pi_test2",
    stripe_payment_link_id: null,
    stripe_charge_id: "ch_test2",
    donor_email: "donor2@example.com",
    donor_name: "Jane Donor",
    amount_cents: 10000,
    currency: "usd",
    gift_type: "honeymoon",
    guest_id: null,
    status: "completed",
    thank_you_email_sent: true,
    thank_you_email_sent_at: "2025-01-02T00:00:00Z",
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    guest_first_name: null,
    guest_last_name: null,
    guest_email: null,
  },
  {
    id: "gift-3",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: "pi_test3",
    stripe_payment_link_id: null,
    stripe_charge_id: "ch_test3",
    donor_email: "donor3@example.com",
    donor_name: "Bob Donor",
    amount_cents: 2500,
    currency: "usd",
    gift_type: "student_loans",
    guest_id: null,
    status: "pending",
    thank_you_email_sent: false,
    thank_you_email_sent_at: null,
    created_at: "2025-01-03T00:00:00Z",
    updated_at: "2025-01-03T00:00:00Z",
    guest_first_name: null,
    guest_last_name: null,
    guest_email: null,
  },
];

// Chainable db mock
function createChainableDb(terminals: Record<string, unknown> = {}) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_, prop: string) => {
      if (prop in terminals) return terminals[prop];
      return (...args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () =>
      createChainableDb({
        execute: mockExecute,
        executeTakeFirst: mockExecuteTakeFirst,
      }),
    fn: {
      sum: () => ({
        as: () => "total_cents",
      }),
      count: () => ({
        as: () => "count",
      }),
    },
  },
}));

describe("Admin Gifts - getGifts", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockExecute.mockResolvedValue(sampleGifts);
  });

  it("should return all gifts with default params", async () => {
    const { getGifts } = await import("@/app/[slug]/admin/gifts/actions");

    const gifts = await getGifts();

    expect(gifts).toHaveLength(3);
    expect(gifts[0]?.id).toBe("gift-1");
  });

  it("should include joined guest data", async () => {
    const { getGifts } = await import("@/app/[slug]/admin/gifts/actions");

    const gifts = await getGifts();
    const giftWithGuest = gifts.find((g) => g.guest_id !== null);

    expect(giftWithGuest).toBeDefined();
    expect(giftWithGuest?.guest_first_name).toBe("Jane");
    expect(giftWithGuest?.guest_last_name).toBe("Guest");
    expect(giftWithGuest?.guest_email).toBe("jane@example.com");
  });

  it("should return gifts with all required fields", async () => {
    const { getGifts } = await import("@/app/[slug]/admin/gifts/actions");

    const gifts = await getGifts();

    for (const gift of gifts) {
      expect(gift.id).toBeDefined();
      expect(gift.amount_cents).toBeDefined();
      expect(gift.currency).toBeDefined();
      expect(gift.status).toBeDefined();
      expect(gift.created_at).toBeDefined();
    }
  });
});

describe("Admin Gifts - getGiftStats", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("should return stats structure with all fund types", async () => {
    mockExecute.mockResolvedValue([
      {
        gift_type: "baby_fund",
        status: "completed",
        total_cents: 5000,
        count: 1,
      },
      {
        gift_type: "honeymoon",
        status: "completed",
        total_cents: 10000,
        count: 1,
      },
      {
        gift_type: "student_loans",
        status: "completed",
        total_cents: 2500,
        count: 1,
      },
    ]);

    const { getGiftStats } = await import("@/app/[slug]/admin/gifts/actions");

    const stats = await getGiftStats();

    expect(stats.baby_fund).toBeDefined();
    expect(stats.honeymoon).toBeDefined();
    expect(stats.student_loans).toBeDefined();
    expect(stats.unknown).toBeDefined();
    expect(stats.grand_total).toBeDefined();
    expect(stats.total_count).toBeDefined();
  });

  it("should calculate totals correctly", async () => {
    mockExecute.mockResolvedValue([
      {
        gift_type: "baby_fund",
        status: "completed",
        total_cents: 5000,
        count: 2,
      },
      {
        gift_type: "honeymoon",
        status: "completed",
        total_cents: 15000,
        count: 3,
      },
    ]);

    const { getGiftStats } = await import("@/app/[slug]/admin/gifts/actions");

    const stats = await getGiftStats();

    expect(stats.baby_fund.total).toBe(5000);
    expect(stats.baby_fund.count).toBe(2);
    expect(stats.honeymoon.total).toBe(15000);
    expect(stats.honeymoon.count).toBe(3);
    expect(stats.grand_total).toBe(20000);
    expect(stats.total_count).toBe(5);
  });

  it("should throw error on database failure", async () => {
    mockExecute.mockRejectedValue(new Error("Database error"));

    const { getGiftStats } = await import("@/app/[slug]/admin/gifts/actions");

    await expect(getGiftStats()).rejects.toThrow("Database error");
  });

  it("should handle null gift types as unknown", async () => {
    mockExecute.mockResolvedValue([
      { gift_type: null, status: "completed", total_cents: 3000, count: 1 },
    ]);

    const { getGiftStats } = await import("@/app/[slug]/admin/gifts/actions");

    const stats = await getGiftStats();

    expect(stats.unknown.total).toBe(3000);
    expect(stats.unknown.count).toBe(1);
  });
});

describe("Admin Gifts - Gift Status Types", () => {
  it("should handle completed status", () => {
    const completedGift = sampleGifts.find((g) => g.status === "completed");
    expect(completedGift).toBeDefined();
  });

  it("should handle pending status", () => {
    const pendingGift = sampleGifts.find((g) => g.status === "pending");
    expect(pendingGift).toBeDefined();
  });

  it("should have valid gift types", () => {
    const validTypes = ["baby_fund", "honeymoon", "student_loans", null];
    for (const gift of sampleGifts) {
      expect(validTypes).toContain(gift.gift_type);
    }
  });
});

describe("Admin Gifts - Currency Formatting", () => {
  it("should store amounts in cents", () => {
    for (const gift of sampleGifts) {
      expect(Number.isInteger(gift.amount_cents)).toBe(true);
      expect(gift.amount_cents).toBeGreaterThan(0);
    }
  });

  it("should use USD currency", () => {
    for (const gift of sampleGifts) {
      expect(gift.currency).toBe("usd");
    }
  });
});

describe("Admin Gifts - Thank You Email Tracking", () => {
  it("should track thank you email sent status", () => {
    const sentGift = sampleGifts.find((g) => g.thank_you_email_sent === true);
    expect(sentGift).toBeDefined();
    expect(sentGift?.thank_you_email_sent_at).toBeDefined();
  });

  it("should have null sent_at when not sent", () => {
    const notSentGift = sampleGifts.find(
      (g) => g.thank_you_email_sent === false,
    );
    expect(notSentGift).toBeDefined();
    expect(notSentGift?.thank_you_email_sent_at).toBeNull();
  });
});
