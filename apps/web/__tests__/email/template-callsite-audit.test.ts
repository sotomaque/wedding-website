import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDefaultTemplates } from "@/lib/email/default-templates";

/**
 * Static analysis test: scans all source files that call renderEmailTemplate
 * and verifies the variable keys they pass match the template definitions.
 *
 * This catches the class of bug where code passes { STATUS_TEXT: ... } but
 * the template expects {{{STATUS}}}, causing raw placeholders in real emails.
 */

// Build a map of template type → declared variable keys
const templates = getDefaultTemplates("test");
const enTemplates = templates.filter((t) => (t.language as string) === "en");
const templateVarMap = new Map<string, Set<string>>();

for (const tpl of enTemplates) {
  const keys = ((tpl.variables as Array<{ key: string }>) ?? []).map(
    (v) => v.key,
  );
  templateVarMap.set(tpl.type as string, new Set(keys));
}

/**
 * Extract renderEmailTemplate call sites from a source file.
 * Uses brace-depth counting to correctly extract the variables object
 * even when it contains nested expressions (template literals, function calls).
 */
function extractCallSites(
  source: string,
): Array<{ templateType: string; variableKeys: string[]; lineNumber: number }> {
  const results: Array<{
    templateType: string;
    variableKeys: string[];
    lineNumber: number;
  }> = [];

  // Find the template type in each renderEmailTemplate call
  const callRegex = /renderEmailTemplate\(\s*[\w.]+,\s*["'](\w+)["'],\s*\{/g;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
  while ((match = callRegex.exec(source)) !== null) {
    const templateType = match[1] as string;
    const lineNumber = source.substring(0, match.index).split("\n").length;

    // Find the matching closing brace using depth counting
    const startIdx = match.index + match[0].length - 1; // position of opening {
    let depth = 1;
    let i = startIdx + 1;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }

    const varsBlock = source.substring(startIdx + 1, i - 1);

    // Extract only top-level KEY: patterns (keys that are ALL_CAPS with underscores)
    // This avoids matching nested object keys like { dateStyle: "full" }
    const keyRegex = /^\s*([A-Z][A-Z_0-9]+)\s*:/gm;
    const keys: string[] = [];
    let keyMatch: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
    while ((keyMatch = keyRegex.exec(varsBlock)) !== null) {
      keys.push(keyMatch[1] as string);
    }

    results.push({ templateType, variableKeys: keys, lineNumber });
  }

  return results;
}

// Find all files that call renderEmailTemplate
function findCallSiteFiles(): string[] {
  const appDir = path.resolve(__dirname, "../../app");
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("renderEmailTemplate")) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(appDir);
  return files;
}

describe("Email template call site variable audit", () => {
  const files = findCallSiteFiles();

  it("should find call site files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const filePath of files) {
    const relativePath = path.relative(
      path.resolve(__dirname, "../.."),
      filePath,
    );
    const source = fs.readFileSync(filePath, "utf-8");
    const callSites = extractCallSites(source);

    for (const callSite of callSites) {
      describe(`${relativePath}:${callSite.lineNumber} → ${callSite.templateType}`, () => {
        const expectedVars = templateVarMap.get(callSite.templateType);

        it("should reference a known template type", () => {
          expect(expectedVars).toBeDefined();
        });

        if (expectedVars) {
          it("should not pass variables the template does not declare", () => {
            const extraVars = callSite.variableKeys.filter(
              (k) => !expectedVars.has(k),
            );
            if (extraVars.length > 0) {
              throw new Error(
                `Passes variables not in template: ${extraVars.join(", ")}. ` +
                  `Template "${callSite.templateType}" expects: ${[...expectedVars].join(", ")}`,
              );
            }
          });

          it("should pass all required template variables", () => {
            const missingVars = [...expectedVars].filter(
              (k) => !callSite.variableKeys.includes(k),
            );
            if (missingVars.length > 0) {
              throw new Error(
                `Missing template variables: ${missingVars.join(", ")}. ` +
                  `These will show as raw {{{PLACEHOLDER}}} in sent emails.`,
              );
            }
          });
        }
      });
    }
  }
});
