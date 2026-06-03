import DOMPurify from "isomorphic-dompurify";

// Tags the Tiptap rich-text editor can produce (and that the story sections'
// `[&_p]/[&_h2]/…` styles target). Anything else — scripts, iframes, event
// handlers, images, etc. — is stripped.
const ALLOWED_TAGS = [
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
];
const ALLOWED_ATTR = ["href", "target", "rel"];

/**
 * Sanitize admin-authored rich-text HTML before it's rendered to guests with
 * `dangerouslySetInnerHTML`. The editor output (and any AI-streamed HTML) is
 * untrusted at the render boundary, so we allowlist only formatting tags and
 * drop scripts, event handlers, and dangerous URL schemes.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
