import sanitizeHtml from "sanitize-html";

/**
 * Sanitize admin-authored rich-text HTML before it's rendered to guests with
 * `dangerouslySetInnerHTML`. The editor output (and any AI-streamed HTML) is
 * untrusted at the render boundary, so we allowlist only formatting tags and
 * drop scripts, event handlers, and dangerous URL schemes.
 *
 * Uses sanitize-html (pure JS) rather than DOMPurify/jsdom — jsdom imports
 * `node:worker_threads`, which the Next/Turbopack build tracer can't handle.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    // Tags the Tiptap editor can produce (and that the story sections'
    // `[&_p]/[&_h2]/…` styles target).
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "hr",
      "span",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    // Defaults already drop `javascript:`/`data:` hrefs and on* handlers.
  });
}
