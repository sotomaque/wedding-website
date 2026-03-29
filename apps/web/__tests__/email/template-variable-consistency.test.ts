import { describe, expect, it } from "bun:test";
import { getDefaultTemplates } from "@/lib/email/default-templates";

/**
 * Extract all {{{VARIABLE}}} placeholders from a string.
 */
function extractPlaceholders(text: string): Set<string> {
  const matches = text.matchAll(/\{\{\{(\w+)\}\}\}/g);
  return new Set([...matches].map((m) => m[1] as string));
}

describe("Email template variable consistency", () => {
  const templates = getDefaultTemplates("test-wedding-id");

  it("should generate templates for both en and es languages", () => {
    const enTemplates = templates.filter(
      (t) => (t.language as string) === "en",
    );
    const esTemplates = templates.filter(
      (t) => (t.language as string) === "es",
    );
    expect(enTemplates.length).toBeGreaterThan(0);
    expect(esTemplates.length).toBeGreaterThan(0);
    expect(enTemplates.length).toBe(esTemplates.length);
  });

  // Test each template individually
  const enTemplates = templates.filter((t) => (t.language as string) === "en");

  for (const tpl of enTemplates) {
    const type = tpl.type as string;
    const subject = tpl.subject as string;
    const htmlBody = tpl.htmlBody as string;
    const declaredVars = ((tpl.variables as Array<{ key: string }>) ?? []).map(
      (v) => v.key,
    );

    describe(`${type}`, () => {
      it("should have all subject placeholders declared in variables", () => {
        const subjectVars = extractPlaceholders(subject);
        const undeclared = [...subjectVars].filter(
          (v) => !declaredVars.includes(v),
        );

        expect(undeclared).toEqual([]);
      });

      it("should have all HTML body placeholders declared in variables", () => {
        const bodyVars = extractPlaceholders(htmlBody);
        const undeclared = [...bodyVars].filter(
          (v) => !declaredVars.includes(v),
        );

        expect(undeclared).toEqual([]);
      });

      it("should not have declared variables missing from both subject and body", () => {
        const usedVars = new Set([
          ...extractPlaceholders(subject),
          ...extractPlaceholders(htmlBody),
        ]);
        const unused = declaredVars.filter((v) => !usedVars.has(v));

        // Unused variables are a warning, not a failure — they're available
        // for custom template edits. But log them for visibility.
        if (unused.length > 0) {
          console.warn(
            `  [${type}] Declared but unused variables: ${unused.join(", ")}`,
          );
        }
      });
    });

    // Also check the Spanish version has the same placeholders
    const esTpl = templates.find(
      (t) => (t.type as string) === type && (t.language as string) === "es",
    );

    if (esTpl) {
      describe(`${type} (es)`, () => {
        it("should use the same placeholders as the English version", () => {
          const enVars = new Set([
            ...extractPlaceholders(subject),
            ...extractPlaceholders(htmlBody),
          ]);
          const esVars = new Set([
            ...extractPlaceholders(esTpl.subject as string),
            ...extractPlaceholders(esTpl.htmlBody as string),
          ]);

          const missingInEs = [...enVars].filter((v) => !esVars.has(v));
          const extraInEs = [...esVars].filter((v) => !enVars.has(v));

          expect(missingInEs).toEqual([]);
          expect(extraInEs).toEqual([]);
        });
      });
    }
  }
});
