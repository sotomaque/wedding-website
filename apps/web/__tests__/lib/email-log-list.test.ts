import { describe, expect, it } from "bun:test";
import { summarizeEmailLogTypes } from "@/lib/db/admin/email-log-list";

describe("summarizeEmailLogTypes", () => {
  it("counts occurrences per type", () => {
    const result = summarizeEmailLogTypes([
      { type: "wedding_invitation" },
      { type: "wedding_invitation" },
      { type: "calendar_invite" },
    ]);
    expect(result).toEqual([
      { type: "wedding_invitation", count: 2 },
      { type: "calendar_invite", count: 1 },
    ]);
  });

  it("sorts by count desc, then type asc for ties", () => {
    const result = summarizeEmailLogTypes([
      { type: "b" },
      { type: "a" },
      { type: "c" },
      { type: "a" },
      { type: "b" },
    ]);
    // a:2, b:2, c:1 -> ties (a,b) broken alphabetically
    expect(result.map((r) => r.type)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty list for no rows", () => {
    expect(summarizeEmailLogTypes([])).toEqual([]);
  });
});
