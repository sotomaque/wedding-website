import { describe, expect, it } from "bun:test";
import { buildEmailLogData } from "@/lib/email/email-log";

const meta = { weddingId: "w1", guestId: "g1", type: "wedding_invitation" };

describe("buildEmailLogData", () => {
  it("records a successful send with the provider message id", () => {
    const data = buildEmailLogData(
      meta,
      { to: "guest@example.com", subject: "You're invited" },
      { data: { id: "resend-123" }, error: null },
    );
    expect(data).toEqual({
      weddingId: "w1",
      guestId: "g1",
      recipientEmail: "guest@example.com",
      type: "wedding_invitation",
      subject: "You're invited",
      status: "sent",
      providerMessageId: "resend-123",
      errorMessage: null,
    });
  });

  it("records a failed send with the error message and no provider id", () => {
    const data = buildEmailLogData(
      meta,
      { to: "guest@example.com", subject: "Hi" },
      { data: null, error: new Error("Resend API key not configured") },
    );
    expect(data.status).toBe("failed");
    expect(data.errorMessage).toBe("Resend API key not configured");
    expect(data.providerMessageId).toBeNull();
  });

  it("uses the first recipient when `to` is an array", () => {
    const data = buildEmailLogData(
      meta,
      { to: ["first@example.com", "second@example.com"], subject: "Hi" },
      { data: { id: "x" }, error: null },
    );
    expect(data.recipientEmail).toBe("first@example.com");
  });

  it("normalizes a missing guestId to null", () => {
    const data = buildEmailLogData(
      { weddingId: "w1", type: "admin_summary" },
      { to: "admin@example.com", subject: "Digest" },
      { data: { id: "x" }, error: null },
    );
    expect(data.guestId).toBeNull();
  });

  it("falls back to an empty recipient for an empty array", () => {
    const data = buildEmailLogData(
      meta,
      { to: [], subject: "Hi" },
      { data: { id: "x" }, error: null },
    );
    expect(data.recipientEmail).toBe("");
  });
});
