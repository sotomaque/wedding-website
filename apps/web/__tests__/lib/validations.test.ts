import { describe, expect, it } from "vitest";
import { addGuestSchema, editGuestSchema } from "@/lib/validations/guest";
import { rsvpFormSchema } from "@/lib/validations/rsvp";

describe("addGuestSchema", () => {
  it("should validate a minimal valid guest", () => {
    const result = addGuestSchema.safeParse({
      firstName: "John",
      side: "bride",
      list: "a",
      plusOneAllowed: false,
      sendEmail: false,
      family: false,
    });
    expect(result.success).toBe(true);
  });

  it("should require firstName", () => {
    const result = addGuestSchema.safeParse({
      side: "bride",
      list: "a",
      plusOneAllowed: false,
      sendEmail: false,
      family: false,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email format", () => {
    const result = addGuestSchema.safeParse({
      firstName: "John",
      email: "not-an-email",
      side: "bride",
      list: "a",
      plusOneAllowed: false,
      sendEmail: false,
      family: false,
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid email", () => {
    const result = addGuestSchema.safeParse({
      firstName: "John",
      email: "john@example.com",
      side: "bride",
      list: "a",
      plusOneAllowed: false,
      sendEmail: false,
      family: false,
    });
    expect(result.success).toBe(true);
  });

  it("should accept all list values (a, b, c)", () => {
    for (const list of ["a", "b", "c"]) {
      const result = addGuestSchema.safeParse({
        firstName: "John",
        side: "bride",
        list,
        plusOneAllowed: false,
        sendEmail: false,
        family: false,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept all side values (bride, groom, both)", () => {
    for (const side of ["bride", "groom", "both"]) {
      const result = addGuestSchema.safeParse({
        firstName: "John",
        side,
        list: "a",
        plusOneAllowed: false,
        sendEmail: false,
        family: false,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept plus one details", () => {
    const result = addGuestSchema.safeParse({
      firstName: "John",
      side: "bride",
      list: "a",
      plusOneAllowed: true,
      plusOneFirstName: "Jane",
      plusOneLastName: "Doe",
      sendEmail: false,
      family: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("editGuestSchema", () => {
  it("should validate a valid edit", () => {
    const result = editGuestSchema.safeParse({
      firstName: "John",
      side: "groom",
      list: "b",
      plusOneAllowed: false,
      physicalInviteSent: false,
      family: true,
    });
    expect(result.success).toBe(true);
  });

  it("should allow changing list to b or c", () => {
    for (const list of ["b", "c"]) {
      const result = editGuestSchema.safeParse({
        firstName: "John",
        side: "bride",
        list,
        plusOneAllowed: false,
        physicalInviteSent: false,
        family: false,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should allow all contact method options", () => {
    for (const method of ["email", "text", "whatsapp", "phone_call", ""]) {
      const result = editGuestSchema.safeParse({
        firstName: "John",
        side: "bride",
        list: "a",
        plusOneAllowed: false,
        physicalInviteSent: false,
        family: false,
        preferredContactMethod: method,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("rsvpFormSchema", () => {
  it("should validate a minimal RSVP (attending)", () => {
    const result = rsvpFormSchema.safeParse({
      firstName: "John",
      attending: true,
    });
    expect(result.success).toBe(true);
  });

  it("should validate a minimal RSVP (not attending)", () => {
    const result = rsvpFormSchema.safeParse({
      firstName: "John",
      attending: false,
    });
    expect(result.success).toBe(true);
  });

  it("should require firstName", () => {
    const result = rsvpFormSchema.safeParse({
      attending: true,
    });
    expect(result.success).toBe(false);
  });

  it("should accept plus one details", () => {
    const result = rsvpFormSchema.safeParse({
      firstName: "John",
      attending: true,
      plusOneAttending: true,
      plusOneFirstName: "Jane",
      plusOneLastName: "Doe",
      plusOneDietaryRestrictions: "Vegetarian",
    });
    expect(result.success).toBe(true);
  });

  it("should accept dietary restrictions", () => {
    const result = rsvpFormSchema.safeParse({
      firstName: "John",
      attending: true,
      dietaryRestrictions: "Gluten-free, nut allergy",
    });
    expect(result.success).toBe(true);
  });

  it("should accept contact information", () => {
    const result = rsvpFormSchema.safeParse({
      firstName: "John",
      attending: true,
      mailingAddress: "123 Main St, San Diego, CA 92101",
      phoneNumber: "555-123-4567",
      whatsapp: "+1555123456",
      preferredContactMethod: "text",
    });
    expect(result.success).toBe(true);
  });
});
