import { describe, expect, it } from "bun:test";
import {
  createEventSchema,
  createReminderSchema,
  createSeatingChartSchema,
  createTemplateSchema,
  deleteReminderSchema,
  updateGiftSchema,
  updateRemindersSchema,
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

describe("createSeatingChartSchema", () => {
  it("requires a non-empty name with the original message", () => {
    const res = createSeatingChartSchema.safeParse({ notes: "x" });
    expect(res.success).toBe(false);
    if (!res.success)
      expect(res.error.issues[0]?.message).toBe("Chart name is required");
  });

  it("accepts a name with optional seats/notes", () => {
    expect(
      createSeatingChartSchema.safeParse({
        name: "Main",
        defaultSeatsPerTable: 10,
      }).success,
    ).toBe(true);
  });
});

describe("createReminderSchema", () => {
  it("accepts a positive integer", () => {
    expect(
      createReminderSchema.safeParse({ daysBeforeDeadline: 10 }).success,
    ).toBe(true);
  });

  it("rejects non-positive, non-integer, and missing values", () => {
    expect(
      createReminderSchema.safeParse({ daysBeforeDeadline: -5 }).success,
    ).toBe(false);
    expect(
      createReminderSchema.safeParse({ daysBeforeDeadline: 3.5 }).success,
    ).toBe(false);
    expect(createReminderSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateRemindersSchema", () => {
  it("requires schedules to be an array", () => {
    expect(updateRemindersSchema.safeParse({ schedules: "nope" }).success).toBe(
      false,
    );
    expect(
      updateRemindersSchema.safeParse({
        schedules: [{ id: "s1", isEnabled: false }],
      }).success,
    ).toBe(true);
  });
});

describe("deleteReminderSchema", () => {
  it("requires an id", () => {
    expect(deleteReminderSchema.safeParse({}).success).toBe(false);
    expect(deleteReminderSchema.safeParse({ id: "s1" }).success).toBe(true);
  });
});
