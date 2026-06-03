import { describe, expect, it } from "bun:test";
import { resolveMergedInviteStatus } from "@/lib/db/admin/merge-guests";

describe("resolveMergedInviteStatus", () => {
  it("source wins when it's a real yes/no", () => {
    expect(resolveMergedInviteStatus("yes", "no")).toBe("yes");
    expect(resolveMergedInviteStatus("no", "yes")).toBe("no");
    expect(resolveMergedInviteStatus("yes", "pending")).toBe("yes");
  });

  it("a pending source never overwrites the target's real answer", () => {
    expect(resolveMergedInviteStatus("pending", "yes")).toBe("yes");
    expect(resolveMergedInviteStatus("pending", "no")).toBe("no");
    expect(resolveMergedInviteStatus(null, "yes")).toBe("yes");
  });

  it("falls back to pending when neither side responded", () => {
    expect(resolveMergedInviteStatus("pending", "pending")).toBe("pending");
    expect(resolveMergedInviteStatus(null, null)).toBe("pending");
    expect(resolveMergedInviteStatus(undefined, undefined)).toBe("pending");
  });

  it("normalizes unknown values to pending", () => {
    expect(resolveMergedInviteStatus("maybe", "yes")).toBe("yes");
    expect(resolveMergedInviteStatus("maybe", "huh")).toBe("pending");
  });
});
