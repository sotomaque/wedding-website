import { describe, expect, it } from "bun:test";
import { weddingUrl } from "@/lib/url";

describe("weddingUrl", () => {
  it("should build url with slug and path", () => {
    const result = weddingUrl("helen-and-enrique", "/rsvp");

    expect(result).toContain("/helen-and-enrique/rsvp");
  });

  it("should build url with slug only when no path", () => {
    const result = weddingUrl("helen-and-enrique");

    expect(result).toContain("/helen-and-enrique");
    expect(result).not.toContain("/helen-and-enrique/");
  });

  it("should use base url from environment", () => {
    const result = weddingUrl("test-wedding", "/registry");

    expect(result).toMatch(/^https?:\/\/.+\/test-wedding\/registry$/);
  });
});
