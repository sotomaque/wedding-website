import { describe, expect, it } from "bun:test";
import {
  createEventSchema,
  createTemplateSchema,
  updateGiftSchema,
} from "@/lib/validations/admin-api";

describe("createEventSchema", () => {
  it("requires a non-empty name with the original message", () => {
    expect(createEventSchema.safeParse({ description: "x" }).success).toBe(
      false,
    );
    const empty = createEventSchema.safeParse({ name: "  " });
    expect(empty.success).toBe(false);
    if (!empty.success)
      expect(empty.error.issues[0]?.message).toBe("Name is required");
  });

  it("accepts a full valid event and strips unknown keys", () => {
    const result = createEventSchema.safeParse({
      name: "Brunch",
      eventDate: "2026-07-29",
      isDefault: true,
      latitude: 12.34,
      bogus: "dropped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Brunch");
      expect("bogus" in result.data).toBe(false);
    }
  });

  it("rejects a wrongly-typed field", () => {
    expect(
      createEventSchema.safeParse({ name: "x", isDefault: "yes" }).success,
    ).toBe(false);
    expect(
      createEventSchema.safeParse({ name: "x", latitude: "12" }).success,
    ).toBe(false);
  });
});

describe("createTemplateSchema", () => {
  it("requires type, name, subject, and htmlBody", () => {
    expect(createTemplateSchema.safeParse({ name: "Only name" }).success).toBe(
      false,
    );
  });

  it("accepts a valid template with optional fields omitted", () => {
    expect(
      createTemplateSchema.safeParse({
        type: "welcome",
        name: "Welcome",
        subject: "Hi",
        htmlBody: "<p>Hi</p>",
      }).success,
    ).toBe(true);
  });
});

describe("updateGiftSchema", () => {
  it("requires an id with the original message", () => {
    const res = updateGiftSchema.safeParse({ notes: "x" });
    expect(res.success).toBe(false);
    if (!res.success)
      expect(res.error.issues[0]?.message).toBe("Gift ID is required");
  });

  it("allows nulling guestId (unlink) and partial updates", () => {
    expect(
      updateGiftSchema.safeParse({ id: "g1", guestId: null }).success,
    ).toBe(true);
    expect(
      updateGiftSchema.safeParse({ id: "g1", thankYouEmailSent: true }).success,
    ).toBe(true);
  });

  it("rejects a non-boolean thankYouEmailSent", () => {
    expect(
      updateGiftSchema.safeParse({ id: "g1", thankYouEmailSent: "yes" })
        .success,
    ).toBe(false);
  });
});
