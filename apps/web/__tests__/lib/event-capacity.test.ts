import { describe, expect, it } from "bun:test";
import {
  canAccommodate,
  isEventFull,
  remainingCapacity,
} from "@/lib/utils/event-capacity";

describe("isEventFull", () => {
  it("is never full when capacity is null/undefined (unlimited)", () => {
    expect(isEventFull(1000, null)).toBe(false);
    expect(isEventFull(1000, undefined)).toBe(false);
  });

  it("is full when confirmed meets or exceeds capacity", () => {
    expect(isEventFull(100, 100)).toBe(true);
    expect(isEventFull(101, 100)).toBe(true);
  });

  it("is not full below capacity", () => {
    expect(isEventFull(99, 100)).toBe(false);
    expect(isEventFull(0, 1)).toBe(false);
  });
});

describe("remainingCapacity", () => {
  it("returns null for unlimited capacity", () => {
    expect(remainingCapacity(50, null)).toBeNull();
  });

  it("returns seats left, clamped at zero", () => {
    expect(remainingCapacity(40, 100)).toBe(60);
    expect(remainingCapacity(100, 100)).toBe(0);
    expect(remainingCapacity(120, 100)).toBe(0);
  });
});

describe("canAccommodate", () => {
  it("always fits when capacity is unlimited", () => {
    expect(canAccommodate(1000, 50, null)).toBe(true);
  });

  it("fits a party that exactly reaches capacity", () => {
    expect(canAccommodate(96, 4, 100)).toBe(true);
  });

  it("rejects a party that would exceed capacity", () => {
    expect(canAccommodate(98, 4, 100)).toBe(false);
  });

  it("fits a zero-head request (a decline) even when full", () => {
    expect(canAccommodate(100, 0, 100)).toBe(true);
  });
});
