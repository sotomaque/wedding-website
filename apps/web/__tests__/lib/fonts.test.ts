import { describe, expect, it } from "bun:test";
import { FONT_PAIRINGS, generateFontCss, getFontPairing } from "@/lib/fonts";

describe("getFontPairing", () => {
  it("returns the classic default for null/undefined", () => {
    expect(getFontPairing(null).id).toBe("classic");
    expect(getFontPairing(undefined).id).toBe("classic");
  });

  it("returns the classic default for an unknown id", () => {
    expect(getFontPairing("does-not-exist").id).toBe("classic");
  });

  it("returns the matching pairing by id", () => {
    expect(getFontPairing("elegant").id).toBe("elegant");
  });

  it("uses 'classic' as the first preset", () => {
    expect(FONT_PAIRINGS[0]?.id).toBe("classic");
  });

  it("has unique ids", () => {
    const ids = FONT_PAIRINGS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generateFontCss", () => {
  it("is a no-op for the default (classic) pairing", () => {
    expect(generateFontCss(getFontPairing("classic"))).toBe("");
  });

  it("targets the body selector (not :root) for var resolution", () => {
    const css = generateFontCss(getFontPairing("elegant"));
    expect(css.startsWith("body {")).toBe(true);
  });

  it("emits heading and body overrides when both are set", () => {
    const css = generateFontCss(getFontPairing("elegant"));
    expect(css).toContain("--font-heading: var(--font-playfair)");
    expect(css).toContain("--font-body: var(--font-lora)");
  });

  it("only emits a heading override when body uses the default", () => {
    const css = generateFontCss(getFontPairing("editorial"));
    expect(css).toContain("--font-heading: var(--font-lora)");
    expect(css).not.toContain("--font-body");
  });

  it("emits the optional UI font override when a pairing defines uiVar", () => {
    const css = generateFontCss(getFontPairing("lovebird-elegant"));
    expect(css).toContain("--font-heading: var(--font-sacramento)");
    expect(css).toContain("--font-body: var(--font-eb-garamond)");
    expect(css).toContain("--font-ui-text: var(--font-inter)");
  });

  it("does not emit a UI font override when uiVar is unset", () => {
    const css = generateFontCss(getFontPairing("elegant"));
    expect(css).not.toContain("--font-ui-text");
  });
});
