"use client";

import { useState } from "react";

interface WelcomeSectionProps {
  /** Greeting paragraph. Defaults to a generic invite-style line if empty. */
  message?: string;
  /** Hashtag without the "#"; we add the prefix when rendering. */
  hashtag?: string;
}

const DEFAULT_MESSAGE =
  "To our friends and family: We're so excited to celebrate our wedding with you. Find all the details you need to know about our big day here.";

/**
 * Welcome section — short greeting paragraph plus the couple's wedding
 * hashtag with a one-click COPY button. Distinct from "Our Story": this is
 * the first under-hero block, kept brief so guests immediately see the
 * tone of voice and can grab the hashtag for social posts.
 *
 * Currently takes its props from the page (with sensible defaults). A
 * dedicated `welcome` content section + admin editor is a follow-up.
 */
export function WelcomeSection({ message, hashtag }: WelcomeSectionProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const tag = hashtag ? `#${hashtag.replace(/^#/, "")}` : null;
  const text = message?.trim() || DEFAULT_MESSAGE;

  async function copy() {
    if (!tag) return;
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // Clipboard API throws on insecure context (http://), Safari iframe,
      // and when permission is denied. Surface a "Copy failed" state so the
      // guest knows to long-press the hashtag instead of getting silent
      // nothing, and log for diagnosis.
      console.warn("Hashtag copy failed:", err);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  }

  return (
    <section id="welcome" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Welcome!
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-12" />
        <p className="text-foreground/90 text-lg md:text-xl leading-relaxed mb-10">
          {text}
        </p>
        {tag && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-foreground text-2xl md:text-3xl font-serif tracking-wide">
              {tag}
            </p>
            <button
              type="button"
              onClick={copy}
              aria-live="polite"
              className="text-xs uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground border-b border-foreground/40 hover:border-foreground pb-0.5 transition-colors"
            >
              {copyFailed ? "Copy failed" : copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
