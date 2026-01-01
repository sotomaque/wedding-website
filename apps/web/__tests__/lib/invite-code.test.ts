import { describe, expect, it } from "vitest";
import { generateInviteCode } from "@/lib/utils/invite-code";

describe("generateInviteCode", () => {
  it("should generate a code in format XXXX-XXXX", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("should generate unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    // With 100 random codes, we should have at least 95 unique ones
    expect(codes.size).toBeGreaterThan(95);
  });

  it("should not contain confusing characters (0, O, I, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).not.toMatch(/[0OI1]/);
    }
  });

  it("should always be 9 characters (including hyphen)", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode();
      expect(code.length).toBe(9);
    }
  });
});
