// Removes the four picker section functions from settings-client.tsx
// after extracting them to apps/web/components/customization/appearance-pickers.tsx.
// Anchored on unique tokens so a regex bug can't eat unrelated code.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(
  "apps/web/app/[slug]/admin/settings/settings-client.tsx",
);
const src = readFileSync(target, "utf8");

const startAnchor = "function BrandingSection({ wedding }: { wedding: Wedding }) {";
const endAnchor = "const LANGUAGE_LABELS: Record<string, string> = {";

const startIdx = src.indexOf(startAnchor);
const endIdx = src.indexOf(endAnchor);

if (startIdx === -1) {
  throw new Error(`start anchor not found: ${startAnchor}`);
}
if (endIdx === -1) {
  throw new Error(`end anchor not found: ${endAnchor}`);
}
if (endIdx < startIdx) {
  throw new Error("end anchor appears before start anchor");
}

const before = src.slice(0, startIdx);
const after = src.slice(endIdx);
const next = `${before}${after}`;

writeFileSync(target, next, "utf8");

const removedBytes = src.length - next.length;
const removedLines = src.slice(startIdx, endIdx).split("\n").length - 1;
console.log(
  `stripped ${removedBytes} bytes (~${removedLines} lines) from settings-client.tsx`,
);
