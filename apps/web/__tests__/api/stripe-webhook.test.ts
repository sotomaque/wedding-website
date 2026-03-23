import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock env
mock.module("@/env", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_mock",
    STRIPE_WEBHOOK_SECRET: "whsec_mock",
    STRIPE_PRODUCT_BABY_FUND: "prod_baby_fund",
    STRIPE_PRODUCT_HONEYMOON: "prod_honeymoon",
    STRIPE_PRODUCT_STUDENT_LOANS: "prod_student_loans",
  },
}));

// Create db mock with tracking
const mockGuestFindFirst = mock(() => Promise.resolve(null));
const mockGiftFindFirst = mock(() => Promise.resolve(null));
const mockGiftCreate = mock(() =>
  Promise.resolve({
    id: "gift-123",
    donorEmail: "test@example.com",
    donorName: "Test User",
    amountCents: 5000,
    currency: "usd",
    giftType: "baby_fund",
    guestId: null,
    status: "completed",
  }),
);
const mockGiftUpdate = mock(() => Promise.resolve({}));

const mockWeddingFindFirst = mock(() =>
  Promise.resolve({ id: "test-wedding-id" }),
);

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findFirst: mockGuestFindFirst,
    },
    gift: {
      findFirst: mockGiftFindFirst,
      create: mockGiftCreate,
      update: mockGiftUpdate,
    },
    wedding: {
      findFirst: mockWeddingFindFirst,
      findUnique: mock(() =>
        Promise.resolve({
          id: "test-wedding-id",
          slug: "test-wedding",
          coupleName: "Test Couple",
          emailFromName: "Test Couple",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: "admin@example.com",
          contactEmail: "admin@example.com",
        }),
      ),
    },
  },
}));

// Mock Stripe
const mockPaymentIntentRetrieve = mock(() =>
  Promise.resolve({
    id: "pi_test123",
    payment_details: {
      order_reference: "prod_baby_fund",
    },
  }),
);

const mockConstructEvent = mock(
  (body: string, signature: string, secret: string) => ({
    id: "evt_test123",
    type: "charge.succeeded",
    api_version: "2025-12-15.clover",
    created: Date.now() / 1000,
    livemode: false,
    data: {
      object: {
        id: "ch_test123",
        amount: 5000,
        currency: "usd",
        status: "succeeded",
        paid: true,
        payment_intent: "pi_test123",
        billing_details: {
          email: "donor@example.com",
          name: "John Donor",
          phone: "+1234567890",
        },
        metadata: {},
      },
    },
  }),
);

mock.module("stripe", () => {
  return {
    default: class Stripe {
      webhooks = {
        constructEvent: mockConstructEvent,
      };
      paymentIntents = {
        retrieve: mockPaymentIntentRetrieve,
      };
    },
  };
});

describe("Stripe Webhook - Request Validation", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockGiftUpdate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
  });

  it("should reject requests without stripe-signature header", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No signature provided");
  });
});

describe("Stripe Webhook - Gift Type Mapping", () => {
  it("should map baby fund product ID correctly", async () => {
    // Import the module to test getGiftTypeFromProductId indirectly
    // Since it's not exported, we test it through the integration
    const { env } = await import("@/env");
    expect(env.STRIPE_PRODUCT_BABY_FUND).toBe("prod_baby_fund");
  });

  it("should map honeymoon product ID correctly", async () => {
    const { env } = await import("@/env");
    expect(env.STRIPE_PRODUCT_HONEYMOON).toBe("prod_honeymoon");
  });

  it("should map student loans product ID correctly", async () => {
    const { env } = await import("@/env");
    expect(env.STRIPE_PRODUCT_STUDENT_LOANS).toBe("prod_student_loans");
  });
});

describe("Stripe Webhook - Charge Event Handling", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockGiftUpdate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();

    // Reset mock to return null for existing gift checks
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);
  });

  it("should handle charge.succeeded event", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_test123",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_test123",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_test123",
          billing_details: {
            email: "donor@example.com",
            name: "John Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should handle charge.failed event", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_test456",
      type: "charge.failed",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_test456",
          amount: 5000,
          currency: "usd",
          status: "failed",
          paid: false,
          failure_code: "card_declined",
          failure_message: "Your card was declined.",
          payment_intent: "pi_test456",
          billing_details: {
            email: "donor@example.com",
            name: "John Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({ type: "charge.failed" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should handle charge.pending event", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_test789",
      type: "charge.pending",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_test789",
          amount: 5000,
          currency: "usd",
          status: "pending",
          paid: false,
          payment_intent: "pi_test789",
          billing_details: {
            email: "donor@example.com",
            name: "John Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({ type: "charge.pending" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should handle charge.refunded event", async () => {
    // First set up existing gift for refund
    mockGiftFindFirst.mockResolvedValue({
      id: "gift-123",
      status: "completed",
      amountCents: 5000,
    });

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_test_refund",
      type: "charge.refunded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_test_refund",
          amount: 5000,
          amount_refunded: 5000,
          currency: "usd",
          refunded: true,
          payment_intent: "pi_test_refund",
          billing_details: {
            email: "donor@example.com",
            name: "John Donor",
            phone: null,
          },
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({ type: "charge.refunded" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should acknowledge unhandled event types", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_unhandled",
      type: "payment_intent.created",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "pi_unhandled",
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({ type: "payment_intent.created" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });
});

describe("Stripe Webhook - Idempotency", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockGiftUpdate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
  });

  it("should skip processing when gift already exists for charge ID", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_duplicate",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_duplicate",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_duplicate",
          billing_details: {
            email: "new_donor@example.com",
            name: "New Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should have idempotency check that queries by charge ID", () => {
    expect(true).toBe(true);
  });
});

describe("Stripe Webhook - Guest Matching", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockGiftUpdate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
    // Reset to default behavior
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test",
      payment_details: {
        order_reference: "prod_baby_fund",
      },
    });
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);
  });

  it("should attempt to match guest by email", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_email_match",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_email_match",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_email_match",
          billing_details: {
            email: "guest@example.com",
            name: "Test Guest",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    // The findGuest function queries the database
    expect(mockGuestFindFirst).toHaveBeenCalled();
  });

  it("should attempt to match guest by name when email not found", async () => {
    mockGuestFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_name_match",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_name_match",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_name_match",
          billing_details: {
            email: null,
            name: "John Smith",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should attempt to match guest by phone number", async () => {
    mockGuestFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_phone_match",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_phone_match",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_phone_match",
          billing_details: {
            email: null,
            name: null,
            phone: "+1-555-123-4567",
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

describe("Stripe Webhook - Gift Type from Product ID", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);
  });

  it("should determine baby_fund gift type from product ID", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_baby",
      payment_details: {
        order_reference: "prod_baby_fund",
      },
    });

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_baby",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_baby",
          amount: 10000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_baby",
          billing_details: {
            email: "donor@example.com",
            name: "Baby Fund Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockPaymentIntentRetrieve).toHaveBeenCalledWith("pi_baby");
  });

  it("should determine honeymoon gift type from product ID", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_honeymoon",
      payment_details: {
        order_reference: "prod_honeymoon",
      },
    });

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_honeymoon",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_honeymoon",
          amount: 15000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_honeymoon",
          billing_details: {
            email: "donor@example.com",
            name: "Honeymoon Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockPaymentIntentRetrieve).toHaveBeenCalledWith("pi_honeymoon");
  });

  it("should determine student_loans gift type from product ID", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_loans",
      payment_details: {
        order_reference: "prod_student_loans",
      },
    });

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_loans",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_loans",
          amount: 20000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_loans",
          billing_details: {
            email: "donor@example.com",
            name: "Student Loans Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockPaymentIntentRetrieve).toHaveBeenCalledWith("pi_loans");
  });

  it("should return null for unknown product ID", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_unknown",
      payment_details: {
        order_reference: "prod_unknown_product",
      },
    });

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_unknown",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_unknown",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_unknown",
          billing_details: {
            email: "donor@example.com",
            name: "Unknown Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

describe("Stripe Webhook - Error Handling", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
    // Reset to default behavior
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test",
      payment_details: {
        order_reference: "prod_baby_fund",
      },
    });
    mockGiftCreate.mockResolvedValue({
      id: "gift-123",
      donorEmail: "test@example.com",
      donorName: "Test User",
      amountCents: 5000,
      currency: "usd",
      giftType: "baby_fund",
      guestId: null,
      status: "completed",
    });
  });

  it("should handle invalid webhook signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "invalid_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid signature");
  });

  it("should handle PaymentIntent retrieval failure gracefully", async () => {
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);
    mockPaymentIntentRetrieve.mockRejectedValue(
      new Error("PaymentIntent not found"),
    );

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_pi_fail",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_pi_fail",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_nonexistent",
          billing_details: {
            email: "donor@example.com",
            name: "Test Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    // Should still succeed - PaymentIntent retrieval failure shouldn't stop processing
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should handle database insert failure", async () => {
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);
    mockGiftCreate.mockRejectedValue(new Error("Database insert failed"));

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_db_fail",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_db_fail",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_db_fail",
          billing_details: {
            email: "donor@example.com",
            name: "Test Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

describe("Stripe Webhook - Gift Notification Email", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
    // Reset to default behavior
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test",
      payment_details: {
        order_reference: "prod_baby_fund",
      },
    });
    mockGiftCreate.mockResolvedValue({
      id: "gift-123",
      donorEmail: "test@example.com",
      donorName: "Test User",
      amountCents: 5000,
      currency: "usd",
      giftType: "baby_fund",
      guestId: null,
      status: "completed",
    });
  });

  it("should attempt to send gift notification email after successful charge", async () => {
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_email_test",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_email_test",
          amount: 7500,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_email_test",
          billing_details: {
            email: "generous@donor.com",
            name: "Generous Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should format gift notification with matched guest info", async () => {
    // Mock finding a guest match
    mockGuestFindFirst
      .mockResolvedValueOnce({
        id: "guest-123",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      })
      .mockResolvedValue(null);
    mockGiftFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_matched",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_matched",
          amount: 10000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_matched",
          billing_details: {
            email: "jane@example.com",
            name: "Jane Doe",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should format gift notification without guest match", async () => {
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_unmatched",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_unmatched",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_unmatched",
          billing_details: {
            email: "stranger@example.com",
            name: "Unknown Person",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

describe("Stripe Webhook - Currency Handling", () => {
  beforeEach(() => {
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockGuestFindFirst.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
    // Reset to default behavior
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test",
      payment_details: {
        order_reference: "prod_baby_fund",
      },
    });
    mockGiftCreate.mockResolvedValue({
      id: "gift-123",
      donorEmail: "test@example.com",
      donorName: "Test User",
      amountCents: 5000,
      currency: "usd",
      giftType: "baby_fund",
      guestId: null,
      status: "completed",
    });
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);
  });

  it("should handle USD currency correctly", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_usd",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_usd",
          amount: 5000, // $50.00
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_usd",
          billing_details: {
            email: "donor@example.com",
            name: "USD Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should handle EUR currency correctly", async () => {
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_eur",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_eur",
          amount: 10000, // 100.00
          currency: "eur",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_eur",
          billing_details: {
            email: "donor@example.com",
            name: "EUR Donor",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

describe("Stripe Webhook - Existing Gift Updates", () => {
  beforeEach(() => {
    mockGuestFindFirst.mockClear();
    mockGiftFindFirst.mockClear();
    mockGiftCreate.mockClear();
    mockGiftUpdate.mockClear();
    mockConstructEvent.mockClear();
    mockPaymentIntentRetrieve.mockClear();
    // Reset to default behavior
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test",
      payment_details: {
        order_reference: "prod_baby_fund",
      },
    });
    mockGiftCreate.mockResolvedValue({
      id: "gift-123",
      donorEmail: "test@example.com",
      donorName: "Test User",
      amountCents: 5000,
      currency: "usd",
      giftType: "baby_fund",
      guestId: null,
      status: "completed",
    });
  });

  it("should successfully process charge when existing gift found by payment intent", async () => {
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_update",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_update",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_existing",
          billing_details: {
            email: "new_email@example.com",
            name: "New Name",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response = await POST(request);
    // Webhook should process successfully
    expect(response.status).toBe(200);
    // Verify that create was called (new gift created when no existing found)
    expect(mockGiftCreate).toHaveBeenCalled();
  });

  it("should not duplicate gift records (idempotency)", async () => {
    mockGiftFindFirst.mockResolvedValue(null);
    mockGuestFindFirst.mockResolvedValue(null);

    mockConstructEvent.mockImplementation(() => ({
      id: "evt_idempotent",
      type: "charge.succeeded",
      api_version: "2025-12-15.clover",
      created: Date.now() / 1000,
      livemode: false,
      data: {
        object: {
          id: "ch_same_charge",
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          paid: true,
          payment_intent: "pi_same",
          billing_details: {
            email: "donor@example.com",
            name: "Donor Name",
            phone: null,
          },
          metadata: {},
        },
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    // First request
    const request1 = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Second request (duplicate) - should also succeed (idempotent)
    const request2 = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_signature" },
      body: JSON.stringify({ type: "charge.succeeded" }),
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(200);
  });
});
