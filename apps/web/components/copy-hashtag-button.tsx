"use client";

import { useState } from "react";

/**
 * Tiny client-only button that copies the wedding hashtag to the clipboard.
 * Split out of WelcomeSection so the surrounding section stays a Server
 * Component — only the interactive button ships JS to the client.
 */
export function CopyHashtagButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // Clipboard API throws on insecure context (http://), Safari iframe,
      // and when permission is denied. Surface "Copy failed" so the guest
      // knows to long-press the hashtag instead of getting silent nothing.
      console.warn("Hashtag copy failed:", err);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="text-xs uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground border-b border-foreground/40 hover:border-foreground pb-0.5 transition-colors"
    >
      {copyFailed ? "Copy failed" : copied ? "Copied!" : "Copy"}
    </button>
  );
}
