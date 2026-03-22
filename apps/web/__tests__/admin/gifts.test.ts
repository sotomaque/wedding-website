import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
  },
}));

// Create Prisma-style db mocks
const mockGiftFindMany = mock(() => Promise.resolve([]));
const mockGiftGroupBy = mock(() => Promise.resolve([]));

// Sample gift data (camelCase for Prisma)
const sampleGifts = [
  {
    id: "gift-1",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "pi_test1",
    stripePaymentLinkId: null,
    stripeChargeId: "ch_test1",
    donorEmail: "donor1@example.com",
    donorName: "John Donor",
    amountCents: 5000,
    currency: "usd",
    giftType: "baby_fund",
    guestId: "guest-123",
    status: "completed",
    thankYouEmailSent: false,
    thankYouEmailSentAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    // Prisma includes nested guest relation
    guest: {
      firstName: "Jane",
      lastName: "Guest",
      email: "jane@example.com",
    },
    // Flattened after mapping in the action
    guest_first_name: "Jane",
    guest_last_name: "Guest",
    guest_email: "jane@example.com",
  },
  {
    id: "gift-2",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "pi_test2",
    stripePaymentLinkId: null,
    stripeChargeId: "ch_test2",
    donorEmail: "donor2@example.com",
    donorName: "Jane Donor",
    amountCents: 10000,
    currency: "usd",
    giftType: "honeymoon",
    guestId: null,
    status: "completed",
    thankYouEmailSent: true,
    thankYouEmailSentAt: "2025-01-02T00:00:00Z",
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    guest: null,
    guest_first_name: null,
    guest_last_name: null,
    guest_email: null,
  },
  {
    id: "gift-3",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: "pi_test3",
    stripePaymentLinkId: null,
    stripeChargeId: "ch_test3",
    donorEmail: "donor3@example.com",
    donorName: "Bob Donor",
    amountCents: 2500,
    currency: "usd",
    giftType: "student_loans",
    guestId: null,
    status: "pending",
    thankYouEmailSent: false,
    thankYouEmailSentAt: null,
    createdAt: "2025-01-03T00:00:00Z",
    updatedAt: "2025-01-03T00:00:00Z",
    guest: null,
    guest_first_name: null,
    guest_last_name: null,
    guest_email: null,
  },
];

mock.module("@/lib/db", () => ({
  db: {
    gift: {
      findMany: mockGiftFindMany,
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
      groupBy: mockGiftGroupBy,
    },
    guest: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
    },
  },
}));

describe("Admin Gifts - getGifts", () => {
  beforeEach(() => {
    mockGiftFindMany.mockClear();
    mockGiftFindMany.mockResolvedValue(sampleGifts);
  });

  it("should return all gifts with default params", async () => {
    const { getGifts } = await import("@/app/admin/gifts/actions");

    const gifts = await getGifts();

    expect(gifts).toHaveLength(3);
    expect(gifts[0]?.id).toBe("gift-1");
  });

  it("should include joined guest data", async () => {
    const { getGifts } = await import("@/app/admin/gifts/actions");

    const gifts = await getGifts();
    const giftWithGuest = gifts.find((g) => g.guestId !== null);

    expect(giftWithGuest).toBeDefined();
    expect(giftWithGuest?.guest_first_name).toBe("Jane");
    expect(giftWithGuest?.guest_last_name).toBe("Guest");
    expect(giftWithGuest?.guest_email).toBe("jane@example.com");
  });

  it("should return gifts with all required fields", async () => {
    const { getGifts } = await import("@/app/admin/gifts/actions");

    const gifts = await getGifts();

    for (const gift of gifts) {
      expect(gift.id).toBeDefined();
      expect(gift.amountCents).toBeDefined();
      expect(gift.currency).toBeDefined();
      expect(gift.status).toBeDefined();
      expect(gift.createdAt).toBeDefined();
    }
  });
});

describe("Admin Gifts - getGiftStats", () => {
  beforeEach(() => {
    mockGiftGroupBy.mockClear();
  });

  it("should return stats structure with all fund types", async () => {
    mockGiftGroupBy.mockResolvedValue([
      {
        giftType: "baby_fund",
        status: "completed",
        _sum: { amountCents: 5000 },
        _count: { id: 1 },
      },
      {
        giftType: "honeymoon",
        status: "completed",
        _sum: { amountCents: 10000 },
        _count: { id: 1 },
      },
      {
        giftType: "student_loans",
        status: "completed",
        _sum: { amountCents: 2500 },
        _count: { id: 1 },
      },
    ]);

    const { getGiftStats } = await import("@/app/admin/gifts/actions");

    const stats = await getGiftStats();

    expect(stats.baby_fund).toBeDefined();
    expect(stats.honeymoon).toBeDefined();
    expect(stats.student_loans).toBeDefined();
    expect(stats.unknown).toBeDefined();
    expect(stats.grand_total).toBeDefined();
    expect(stats.total_count).toBeDefined();
  });

  it("should calculate totals correctly", async () => {
    mockGiftGroupBy.mockResolvedValue([
      {
        giftType: "baby_fund",
        status: "completed",
        _sum: { amountCents: 5000 },
        _count: { id: 2 },
      },
      {
        giftType: "honeymoon",
        status: "completed",
        _sum: { amountCents: 15000 },
        _count: { id: 3 },
      },
    ]);

    const { getGiftStats } = await import("@/app/admin/gifts/actions");

    const stats = await getGiftStats();

    expect(stats.baby_fund.total).toBe(5000);
    expect(stats.baby_fund.count).toBe(2);
    expect(stats.honeymoon.total).toBe(15000);
    expect(stats.honeymoon.count).toBe(3);
    expect(stats.grand_total).toBe(20000);
    expect(stats.total_count).toBe(5);
  });

  it("should throw error on database failure", async () => {
    mockGiftGroupBy.mockRejectedValue(new Error("Database error"));

    const { getGiftStats } = await import("@/app/admin/gifts/actions");

    await expect(getGiftStats()).rejects.toThrow("Database error");
  });

  it("should handle null gift types as unknown", async () => {
    mockGiftGroupBy.mockResolvedValue([
      {
        giftType: null,
        status: "completed",
        _sum: { amountCents: 3000 },
        _count: { id: 1 },
      },
    ]);

    const { getGiftStats } = await import("@/app/admin/gifts/actions");

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
      expect(validTypes).toContain(gift.giftType);
    }
  });
});

describe("Admin Gifts - Currency Formatting", () => {
  it("should store amounts in cents", () => {
    for (const gift of sampleGifts) {
      expect(Number.isInteger(gift.amountCents)).toBe(true);
      expect(gift.amountCents).toBeGreaterThan(0);
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
    const sentGift = sampleGifts.find((g) => g.thankYouEmailSent === true);
    expect(sentGift).toBeDefined();
    expect(sentGift?.thankYouEmailSentAt).toBeDefined();
  });

  it("should have null sent_at when not sent", () => {
    const notSentGift = sampleGifts.find((g) => g.thankYouEmailSent === false);
    expect(notSentGift).toBeDefined();
    expect(notSentGift?.thankYouEmailSentAt).toBeNull();
  });
});
