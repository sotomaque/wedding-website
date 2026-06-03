import { describe, expect, it } from "bun:test";
import {
  rsvpSubmitSchema,
  rsvpUpdateInfoSchema,
  rsvpVerifyQuerySchema,
} from "@/lib/validations/rsvp";

describe("rsvpVerifyQuerySchema", () => {
  it("accepts a non-empty code and trims it", () => {
    const result = rsvpVerifyQuerySchema.safeParse({ code: "  ABCD-1234 " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.code).toBe("ABCD-1234");
  });

  it("rejects a missing or empty code", () => {
    expect(rsvpVerifyQuerySchema.safeParse({}).success).toBe(false);
    expect(rsvpVerifyQuerySchema.safeParse({ code: "" }).success).toBe(false);
    expect(rsvpVerifyQuerySchema.safeParse({ code: "   " }).success).toBe(
      false,
    );
  });

  it("rejects an absurdly long code", () => {
    expect(
      rsvpVerifyQuerySchema.safeParse({ code: "x".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("rsvpSubmitSchema", () => {
  it("accepts a valid submission", () => {
    const result = rsvpSubmitSchema.safeParse({
      inviteCode: "TEST-CODE",
      attending: true,
      dietaryRestrictions: "Vegetarian",
    });
    expect(result.success).toBe(true);
  });

  it("allows omitting dietaryRestrictions", () => {
    expect(
      rsvpSubmitSchema.safeParse({ inviteCode: "X", attending: false }).success,
    ).toBe(true);
  });

  it("requires attending to be a boolean", () => {
    expect(
      rsvpSubmitSchema.safeParse({ inviteCode: "X", attending: "yes" }).success,
    ).toBe(false);
    expect(rsvpSubmitSchema.safeParse({ inviteCode: "X" }).success).toBe(false);
  });

  it("requires a non-empty invite code", () => {
    expect(
      rsvpSubmitSchema.safeParse({ inviteCode: "", attending: true }).success,
    ).toBe(false);
  });

  it("rejects an over-long dietary note", () => {
    expect(
      rsvpSubmitSchema.safeParse({
        inviteCode: "X",
        attending: true,
        dietaryRestrictions: "a".repeat(2001),
      }).success,
    ).toBe(false);
  });
});

describe("rsvpUpdateInfoSchema", () => {
  it("accepts valid contact info", () => {
    const result = rsvpUpdateInfoSchema.safeParse({
      inviteCode: "TEST-CODE",
      mailingAddress: "123 Main St",
      phoneNumber: "555-123-4567",
      whatsapp: "555-123-4567",
      preferredContactMethod: "whatsapp",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty preferredContactMethod (cleared to null in the route)", () => {
    expect(
      rsvpUpdateInfoSchema.safeParse({
        inviteCode: "X",
        preferredContactMethod: "",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown preferredContactMethod", () => {
    expect(
      rsvpUpdateInfoSchema.safeParse({
        inviteCode: "X",
        preferredContactMethod: "carrier_pigeon",
      }).success,
    ).toBe(false);
  });

  it("requires an invite code", () => {
    expect(
      rsvpUpdateInfoSchema.safeParse({ mailingAddress: "123 Main St" }).success,
    ).toBe(false);
  });
});
