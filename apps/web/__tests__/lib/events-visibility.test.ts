import { describe, expect, it } from "bun:test";
import { selectPublicEvents } from "@/lib/events-visibility";

const ev = (id: string, isPublic: boolean) => ({ id, name: id, isPublic });

describe("selectPublicEvents", () => {
  it("keeps public events and drops private ones", () => {
    const events = [
      ev("ceremony", true),
      ev("bachelor-party", false),
      ev("reception", true),
    ];
    expect(selectPublicEvents(events).map((e) => e.id)).toEqual([
      "ceremony",
      "reception",
    ]);
  });

  it("returns everything when all events are public", () => {
    const events = [ev("a", true), ev("b", true)];
    expect(selectPublicEvents(events)).toHaveLength(2);
  });

  it("returns nothing when all events are private", () => {
    expect(selectPublicEvents([ev("a", false), ev("b", false)])).toEqual([]);
  });

  it("preserves order and is a new array (no mutation)", () => {
    const events = [ev("a", true), ev("b", false), ev("c", true)];
    const result = selectPublicEvents(events);
    expect(result).not.toBe(events);
    expect(result.map((e) => e.id)).toEqual(["a", "c"]);
    expect(events).toHaveLength(3); // original untouched
  });

  it("handles an empty list", () => {
    expect(selectPublicEvents([])).toEqual([]);
  });
});
