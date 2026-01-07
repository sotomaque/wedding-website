import { describe, expect, it } from "bun:test";
import { addGuestSchema, editGuestSchema } from "@/lib/validations/guest";
import {
  guestRsvpSchema,
  multiGuestRsvpSchema,
  rsvpFormSchema,
} from "@/lib/validations/rsvp";

describe("addGuestSchema", () => {
  it("should validate a minimal valid guest", () => {
    const result = addGuestSchema.safeParse({
      firstName: "John",
      side: "bride",
      list: "a",
      plusOneAllowed: false,
      sendEmail: false,
      family: false,
      under21: false,
      threeAndUnder: false,
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
      under21: false,
      threeAndUnder: false,
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
      under21: false,
      threeAndUnder: false,
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
      under21: false,
      threeAndUnder: false,
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
        under21: false,
        threeAndUnder: false,
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
        under21: false,
        threeAndUnder: false,
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
      under21: false,
      threeAndUnder: false,
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
      under21: false,
      threeAndUnder: false,
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
        under21: false,
        threeAndUnder: false,
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
        under21: false,
        threeAndUnder: false,
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

describe("guestRsvpSchema", () => {
  it("should validate a minimal attending guest", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      firstName: "John",
      attending: true,
      plusOneAllowed: false,
    });
    expect(result.success).toBe(true);
  });

  it("should validate a minimal declining guest", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      firstName: "John",
      attending: false,
      plusOneAllowed: false,
    });
    expect(result.success).toBe(true);
  });

  it("should require guestId", () => {
    const result = guestRsvpSchema.safeParse({
      firstName: "John",
      attending: true,
      plusOneAllowed: false,
    });
    expect(result.success).toBe(false);
  });

  it("should require firstName", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      attending: true,
      plusOneAllowed: false,
    });
    expect(result.success).toBe(false);
  });

  it("should accept dietary restrictions", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      firstName: "John",
      attending: true,
      plusOneAllowed: false,
      dietaryRestrictions: "Vegetarian, nut allergy",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dietaryRestrictions).toBe("Vegetarian, nut allergy");
    }
  });

  it("should accept under21 and threeAndUnder flags", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      firstName: "John",
      attending: true,
      plusOneAllowed: false,
      under21: true,
      threeAndUnder: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.under21).toBe(true);
      expect(result.data.threeAndUnder).toBe(true);
    }
  });

  it("should accept plus one details when plusOneAllowed is true", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      firstName: "John",
      attending: true,
      plusOneAllowed: true,
      plusOneAttending: true,
      plusOneFirstName: "Jane",
      plusOneLastName: "Doe",
      plusOneDietaryRestrictions: "Gluten-free",
      plusOneUnder21: false,
      plusOneThreeAndUnder: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plusOneAttending).toBe(true);
      expect(result.data.plusOneFirstName).toBe("Jane");
      expect(result.data.plusOneLastName).toBe("Doe");
    }
  });

  it("should accept existingPlusOneId for existing plus ones", () => {
    const result = guestRsvpSchema.safeParse({
      guestId: "guest-123",
      firstName: "John",
      attending: true,
      plusOneAllowed: true,
      existingPlusOneId: "plus-one-456",
      plusOneAttending: true,
      plusOneFirstName: "Jane",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.existingPlusOneId).toBe("plus-one-456");
    }
  });
});

describe("multiGuestRsvpSchema", () => {
  it("should validate a single guest party", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should validate a multi-guest party", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: true,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-3",
          firstName: "Junior",
          attending: false,
          plusOneAllowed: false,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guests.length).toBe(3);
    }
  });

  it("should require at least one guest", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [],
    });
    expect(result.success).toBe(false);
  });

  it("should accept shared contact information", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
      ],
      mailingAddress: "123 Main St, San Diego, CA 92101",
      phoneNumber: "+15551234567",
      whatsapp: "+15551234567",
      preferredContactMethod: "text",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mailingAddress).toBe(
        "123 Main St, San Diego, CA 92101",
      );
      expect(result.data.preferredContactMethod).toBe("text");
    }
  });

  it("should accept all preferred contact methods", () => {
    for (const method of ["email", "text", "whatsapp", "phone_call", ""]) {
      const result = multiGuestRsvpSchema.safeParse({
        guests: [
          {
            guestId: "guest-123",
            firstName: "John",
            attending: true,
            plusOneAllowed: false,
          },
        ],
        preferredContactMethod: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should validate mixed attending/declining party", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Partner",
          dietaryRestrictions: "Vegan",
          under21: false,
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: false, // declining
          plusOneAllowed: false,
        },
        {
          guestId: "guest-3",
          firstName: "Junior",
          attending: true,
          plusOneAllowed: false,
          under21: true,
          threeAndUnder: false,
        },
      ],
      mailingAddress: "456 Oak Ave",
      preferredContactMethod: "whatsapp",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guests[0]?.attending).toBe(true);
      expect(result.data.guests[0]?.plusOneAttending).toBe(true);
      expect(result.data.guests[1]?.attending).toBe(false);
      expect(result.data.guests[2]?.under21).toBe(true);
    }
  });

  it("should handle multiple guests with plus-ones", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Partner 1",
          plusOneDietaryRestrictions: "Vegetarian",
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Partner 2",
          plusOneUnder21: true,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guests[0]?.plusOneFirstName).toBe("Partner 1");
      expect(result.data.guests[1]?.plusOneFirstName).toBe("Partner 2");
      expect(result.data.guests[1]?.plusOneUnder21).toBe(true);
    }
  });

  it("should validate threeAndUnder for plus-ones", () => {
    const result = multiGuestRsvpSchema.safeParse({
      guests: [
        {
          guestId: "guest-1",
          firstName: "Parent",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Child",
          plusOneUnder21: true,
          plusOneThreeAndUnder: true,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guests[0]?.plusOneThreeAndUnder).toBe(true);
    }
  });
});
