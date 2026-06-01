import { describe, expect, it } from "bun:test";
import {
  computeResponseRate,
  foldDimension,
} from "@/lib/db/admin/dashboard-stats";

describe("computeResponseRate", () => {
  it("returns 0 when there are no guests", () => {
    expect(
      computeResponseRate({
        totalGuests: 0,
        attending: 0,
        declined: 0,
        pending: 0,
      }),
    ).toBe(0);
  });

  it("counts attending + declined as responded", () => {
    expect(
      computeResponseRate({
        totalGuests: 10,
        attending: 6,
        declined: 2,
        pending: 2,
      }),
    ).toBe(80);
  });

  it("rounds to the nearest integer", () => {
    // responded = 1 of 3 -> 33.33%
    expect(
      computeResponseRate({
        totalGuests: 3,
        attending: 1,
        declined: 0,
        pending: 2,
      }),
    ).toBe(33);
  });
});

describe("foldDimension", () => {
  const dimensions = [
    { key: "a", label: "List A" },
    { key: "b", label: "List B" },
    { key: "c", label: "List C" },
  ];

  it("folds yes/no/other into attending/declined/pending per key", () => {
    const rows = [
      { key: "a", rsvpStatus: "yes", _count: 3 },
      { key: "a", rsvpStatus: "no", _count: 1 },
      { key: "a", rsvpStatus: "pending", _count: 2 },
      { key: "b", rsvpStatus: "yes", _count: 4 },
    ];
    const result = foldDimension(rows, dimensions);
    expect(result).toEqual([
      {
        key: "a",
        label: "List A",
        total: 6,
        attending: 3,
        declined: 1,
        pending: 2,
      },
      {
        key: "b",
        label: "List B",
        total: 4,
        attending: 4,
        declined: 0,
        pending: 0,
      },
      {
        key: "c",
        label: "List C",
        total: 0,
        attending: 0,
        declined: 0,
        pending: 0,
      },
    ]);
  });

  it("preserves dimension order even when buckets are empty", () => {
    const result = foldDimension([], dimensions);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]);
    expect(result.every((r) => r.total === 0)).toBe(true);
  });

  it("treats unknown rsvpStatus (incl. null) as pending", () => {
    const rows = [
      { key: "a", rsvpStatus: null, _count: 2 },
      { key: "a", rsvpStatus: "maybe", _count: 1 },
    ];
    const [a] = foldDimension(rows, [{ key: "a", label: "List A" }]);
    expect(a).toMatchObject({
      pending: 3,
      attending: 0,
      declined: 0,
      total: 3,
    });
  });

  it("ignores rows whose key isn't a requested dimension (incl. null keys)", () => {
    const rows = [
      { key: "z", rsvpStatus: "yes", _count: 5 },
      { key: null, rsvpStatus: "yes", _count: 9 },
      { key: "a", rsvpStatus: "yes", _count: 1 },
    ];
    const result = foldDimension(rows, [{ key: "a", label: "List A" }]);
    expect(result).toEqual([
      {
        key: "a",
        label: "List A",
        total: 1,
        attending: 1,
        declined: 0,
        pending: 0,
      },
    ]);
  });

  it("coerces a non-numeric _count to 0", () => {
    const rows = [
      { key: "a", rsvpStatus: "yes", _count: undefined as unknown as number },
    ];
    const [a] = foldDimension(rows, [{ key: "a", label: "List A" }]);
    expect(a.total).toBe(0);
  });
});
