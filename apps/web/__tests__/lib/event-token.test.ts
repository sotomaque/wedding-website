import { describe, expect, it } from "bun:test";
import { generateEventToken } from "@/lib/utils/event-token";

describe("generateEventToken", () => {
  it("defaults to 16 url-safe lowercase chars", () => {
    const token = generateEventToken();
    expect(token).toHaveLength(16);
    expect(token).toMatch(/^[a-z2-9]+$/);
  });

  it("excludes ambiguous characters (0, 1, i, l, o)", () => {
    const joined = Array.from({ length: 50 }, () => generateEventToken()).join(
      "",
    );
    expect(joined).not.toMatch(/[01ilo]/);
  });

  it("honors a custom length", () => {
    expect(generateEventToken(24)).toHaveLength(24);
  });

  it("is highly unlikely to collide across many draws", () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => generateEventToken()),
    );
    expect(tokens.size).toBe(500);
  });
});
