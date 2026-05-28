/**
 * Quick screenshot of our local /demo so I can see what the Elegant template
 * renders as it's being rebuilt. Saved to .lovebird-analysis/ours-<step>.png.
 *
 * Run: node scripts/snap-ours.mjs [step-name]
 */
import playwright from "../node_modules/.bun/playwright@1.57.0/node_modules/playwright/index.js";
import path from "node:path";

const { chromium } = playwright;
const STEP = process.argv[2] || "current";
const OUT = path.resolve(".lovebird-analysis", `ours-${STEP}.png`);

const browser = await chromium.launch({ channel: "chrome", timeout: 30000 });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/demo", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.screenshot({ path: OUT, fullPage: true });
console.log("snapped:", OUT);
await browser.close();
