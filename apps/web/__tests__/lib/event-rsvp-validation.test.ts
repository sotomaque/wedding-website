import { describe, expect, it } from "bun:test";
import { publicEventRsvpSchema } from "@/lib/validations/event-rsvp";

describe("publicEventRsvpSchema", () => {
  it("accepts a valid code-mode submission", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "code",
      token: "abc123",
      code: "WXYZ-2345",
      attending: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid name-mode submission with optional fields omitted", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "name",
      token: "abc123",
      firstName: "Pat",
      attending: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects name mode without a first name", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "name",
      token: "abc123",
      firstName: "",
      attending: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects code mode without a code", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "code",
      token: "abc123",
      attending: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown mode", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "carrier-pigeon",
      token: "abc123",
      attending: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing attending flag", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "name",
      token: "abc123",
      firstName: "Pat",
    });
    expect(result.success).toBe(false);
  });

  it("allows an empty-string email in name mode", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "name",
      token: "abc123",
      firstName: "Pat",
      email: "",
      attending: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts additional household guests", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "name",
      token: "abc123",
      firstName: "Pat",
      attending: true,
      additionalGuests: [
        { firstName: "Sam" },
        { firstName: "Alex", lastName: "Guest" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an additional guest without a first name", () => {
    const result = publicEventRsvpSchema.safeParse({
      mode: "code",
      token: "abc123",
      code: "WXYZ-2345",
      attending: true,
      additionalGuests: [{ firstName: "" }],
    });
    expect(result.success).toBe(false);
  });
});
