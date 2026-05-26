/**
 * One-off extraction: render the Lovebird SingleFile capture in headless
 * Chromium, walk the DOM, and dump per-section markup + screenshots to
 * .lovebird-analysis/ so we have ground truth to rebuild the template against.
 *
 * Run: bun run scripts/extract-lovebird.mjs
 */
import playwright from "../node_modules/.bun/playwright@1.57.0/node_modules/playwright/index.js";
const { chromium } = playwright;
import fs from "node:fs/promises";
import path from "node:path";

const HTML_PATH =
  "C:\\Users\\abelm\\Downloads\\Elegant Wedding Guest Communication ｜ Lovebird (5_25_2026 4：40：41 PM).html";
const OUT_DIR = path.resolve("./.lovebird-analysis");

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "sections"), { recursive: true });

const fileUrl = `file:///${HTML_PATH.replace(/\\/g, "/").replace(/ /g, "%20").replace(/｜/g, "%EF%BD%9C").replace(/：/g, "%EF%BC%9A")}`;
console.log("Loading:", fileUrl);

// Headless shell launch hangs on this Windows setup (pipe protocol fails to
// establish). Falling back to system Chrome works around it without needing
// to download another Playwright browser.
const browser = await chromium.launch({ channel: "chrome", timeout: 30000 });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
// Give React a moment to hydrate / render
await page.waitForTimeout(3500);

// Lovebird embeds the actual wedding demo inside an iframe; the outer page
// is Lovebird's marketing chrome. Find the iframe whose content matches the
// template (it'll have Sacramento-styled headings).
const frames = page.frames();
console.log(`Frames on page: ${frames.length}`);
let templateFrame = page.mainFrame();
for (const f of frames) {
  if (f === page.mainFrame()) continue;
  try {
    const hasSacramento = await f.evaluate(() => {
      return Array.from(document.querySelectorAll("*")).some((el) =>
        (getComputedStyle(el).fontFamily || "").toLowerCase().includes("sacramento"),
      );
    });
    console.log(`  frame "${f.name() || "(unnamed)"}" sacramento=${hasSacramento}`);
    if (hasSacramento) {
      templateFrame = f;
      break;
    }
  } catch (e) {
    console.log(`  frame error: ${e.message}`);
  }
}
console.log(`Using frame: ${templateFrame === page.mainFrame() ? "main" : "iframe"}`);

// Full-page screenshot of the whole site (outer chrome included for context)
console.log("Taking full-page screenshot…");
await page.screenshot({
  path: path.join(OUT_DIR, "00-full-page.png"),
  fullPage: true,
});

// Discover section-title elements by font-family (Sacramento is the giveaway
// for Lovebird section titles, whether the underlying tag is h2/h1/div).
const sections = await templateFrame.evaluate(() => {
  // First, find all elements that use Sacramento font (section title style)
  const all = document.querySelectorAll("*");
  const sacramento = [];
  for (const el of all) {
    const ff = getComputedStyle(el).fontFamily || "";
    if (ff.toLowerCase().includes("sacramento") && el.textContent?.trim()) {
      sacramento.push(el);
    }
  }
  console.log(`Sacramento-fonted elements: ${sacramento.length}`);
  // Filter to leaf-ish elements (no child also styled Sacramento) — that's
  // the actual heading text node container.
  const headings = sacramento.filter((el) => {
    const directText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    return directText;
  });

  return headings
    .map((h, i) => {
      const text = (h.textContent || "").trim();
      if (!text) return null;
      const cs = getComputedStyle(h);
      // Walk up enough levels (~6) to capture the section visually but not
      // so high we engulf neighbors. Lovebird's compiled output is deeply
      // nested div soup with no semantic <section> tags.
      let node = h;
      for (let depth = 0; depth < 6 && node.parentElement; depth++) {
        node = node.parentElement;
      }
      const rect = node.getBoundingClientRect();
      return {
        index: i,
        text,
        h2: {
          tag: h.tagName,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          color: cs.color,
          lineHeight: cs.lineHeight,
        },
        container: {
          tag: node.tagName,
          className: node.className?.slice?.(0, 200),
          backgroundColor: getComputedStyle(node).backgroundColor,
          width: rect.width,
          height: rect.height,
          y: rect.top + window.scrollY,
        },
        markup: node.outerHTML.slice(0, 50000),
      };
    })
    .filter(Boolean);
});

console.log(`Found ${sections.length} section-like h2 ancestors.`);

// Also capture body-level page chrome (nav, hero, footer) by looking for tags
// at the top and bottom that aren't section h2 containers.
const chrome = await templateFrame.evaluate(() => {
  const out = {};
  // Hero: assume first big <img> or first major block before the first <h2> with Sacramento
  // Nav: first <nav> or sticky-top element
  const navEl = document.querySelector("nav, header [role='navigation'], header nav");
  if (navEl) {
    const r = navEl.getBoundingClientRect();
    out.nav = {
      tag: navEl.tagName,
      className: navEl.className?.slice?.(0, 200),
      backgroundColor: getComputedStyle(navEl).backgroundColor,
      color: getComputedStyle(navEl).color,
      markup: navEl.outerHTML.slice(0, 20000),
      y: r.top + window.scrollY,
    };
  }
  // Body styles
  out.body = {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    color: getComputedStyle(document.body).color,
    fontFamily: getComputedStyle(document.body).fontFamily,
    fontSize: getComputedStyle(document.body).fontSize,
  };
  return out;
});

console.log("Body styles:", chrome.body);

// For per-section screenshots, use Playwright locators: find the Sacramento
// h2 in the iframe by text, then `scrollIntoViewIfNeeded` + capture an
// element-anchored region. Doing this via locator avoids the cross-frame
// coord-math problem (iframe scrolling vs page screenshot).
async function snapSection(sectionText, fileStem) {
  // Match the FIRST element with this text that's also Sacramento-styled.
  const handle = await templateFrame.evaluateHandle((txt) => {
    const candidates = Array.from(document.querySelectorAll("*"));
    for (const el of candidates) {
      const t = (el.textContent || "").trim();
      if (
        t === txt &&
        (getComputedStyle(el).fontFamily || "").toLowerCase().includes("sacramento")
      ) {
        return el;
      }
    }
    return null;
  }, sectionText);

  const el = handle.asElement();
  if (!el) {
    console.log(`  [skip] no Sacramento element for "${sectionText}"`);
    return;
  }

  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);

  // Walk up a few levels from the h2 to find a "section block" that's tall
  // enough to be the whole section but not the whole page.
  const blockHandle = await templateFrame.evaluateHandle((h2) => {
    let node = h2;
    for (let i = 0; i < 8; i++) {
      if (!node.parentElement) break;
      const next = node.parentElement;
      const rect = next.getBoundingClientRect();
      if (rect.height > window.innerHeight * 4) break; // ancestor too big
      node = next;
    }
    return node;
  }, el);
  const block = blockHandle.asElement();
  if (block) {
    await block.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    try {
      await block.screenshot({
        path: path.join(OUT_DIR, "sections", `${fileStem}.png`),
      });
      console.log(`  snapped ${fileStem}`);
      return;
    } catch (e) {
      console.log(`  block.screenshot failed for ${fileStem}: ${e.message}`);
    }
  }
  // Fallback: screenshot just the h2's bounding area
  await el.screenshot({
    path: path.join(OUT_DIR, "sections", `${fileStem}.png`),
  });
  console.log(`  snapped ${fileStem} (h2 only)`);
}

// Write per-section markup files + screenshots
for (let i = 0; i < sections.length; i++) {
  const s = sections[i];
  const slug = s.text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || `section-${i}`;
  const stem = `${String(i).padStart(2, "0")}-${slug}`;

  await fs.writeFile(
    path.join(OUT_DIR, "sections", `${stem}.html`),
    s.markup,
    "utf8",
  );
  await snapSection(s.text, stem);
}

await fs.writeFile(
  path.join(OUT_DIR, "sections.json"),
  JSON.stringify({ chrome, sections: sections.map((s) => ({ ...s, markup: undefined })) }, null, 2),
  "utf8",
);

await browser.close();
console.log("Done. Output:", OUT_DIR);
