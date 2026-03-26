import { beforeEach, describe, expect, it, mock } from "bun:test";

// Explicitly provide the real implementation to prevent mock leakage from other test files
mock.module("@/lib/email/helpers", () => ({
  getEmailFromAddress: (
    settings: {
      emailFromName?: string | null;
      emailFromAddress?: string | null;
      coupleName: string;
    },
    label?: string,
  ) => {
    const name = label ?? settings.emailFromName ?? settings.coupleName;
    const address = settings.emailFromAddress ?? "noreply@wedding-platform.com";
    return `${name} <${address}>`;
  },
  getNotificationRecipients: (settings: {
    notificationEmails?: string | null;
  }) => {
    if (settings.notificationEmails) {
      return settings.notificationEmails
        .split(",")
        .map((e: string) => e.trim());
    }
    const envEmails = process.env.RSVP_EMAIL;
    if (envEmails) {
      return envEmails.split(",").map((e: string) => e.trim());
    }
    return [];
  },
}));

const { getEmailFromAddress, getNotificationRecipients } = await import(
  "@/lib/email/helpers"
);

describe("getEmailFromAddress", () => {
  it("should use label when provided", () => {
    const result = getEmailFromAddress(
      {
        emailFromName: "Custom Name",
        emailFromAddress: "custom@example.com",
        coupleName: "Couple",
      },
      "My Label",
    );

    expect(result).toBe("My Label <custom@example.com>");
  });

  it("should fall back to emailFromName when no label", () => {
    const result = getEmailFromAddress({
      emailFromName: "Custom Name",
      emailFromAddress: "custom@example.com",
      coupleName: "Couple",
    });

    expect(result).toBe("Custom Name <custom@example.com>");
  });

  it("should fall back to coupleName when no label or emailFromName", () => {
    const result = getEmailFromAddress({
      emailFromName: null,
      emailFromAddress: "custom@example.com",
      coupleName: "Helen & Enrique",
    });

    expect(result).toBe("Helen & Enrique <custom@example.com>");
  });

  it("should use default address when no emailFromAddress", () => {
    const result = getEmailFromAddress({
      emailFromName: "Test",
      emailFromAddress: null,
      coupleName: "Couple",
    });

    expect(result).toBe("Test <noreply@wedding-platform.com>");
  });
});

describe("getNotificationRecipients", () => {
  const originalEnv = process.env.RSVP_EMAIL;

  beforeEach(() => {
    process.env.RSVP_EMAIL = originalEnv;
  });

  it("should split and trim comma-separated emails", () => {
    const result = getNotificationRecipients({
      notificationEmails: "a@test.com, b@test.com , c@test.com",
    });

    expect(result).toEqual(["a@test.com", "b@test.com", "c@test.com"]);
  });

  it("should fall back to RSVP_EMAIL env var", () => {
    process.env.RSVP_EMAIL = "env@test.com";

    const result = getNotificationRecipients({
      notificationEmails: null,
    });

    expect(result).toEqual(["env@test.com"]);
  });

  it("should return empty array when no config and no env var", () => {
    process.env.RSVP_EMAIL = undefined;

    const result = getNotificationRecipients({
      notificationEmails: null,
    });

    expect(result).toEqual([]);
  });

  it("should handle single email without commas", () => {
    const result = getNotificationRecipients({
      notificationEmails: "solo@test.com",
    });

    expect(result).toEqual(["solo@test.com"]);
  });
});
