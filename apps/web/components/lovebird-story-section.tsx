import type { StoryContent } from "@/lib/validations/wedding-content";

interface LovebirdStorySectionProps {
  content?: StoryContent;
}

/**
 * Our Story, Lovebird-style. Prose-only — narrow centered column on the
 * dark forest-green background, Sacramento script heading, then the story
 * body in Quicksand at text-lg. No photo grid (Lovebird's template uses
 * the hero/gallery sections to surface imagery, leaving Our Story as a
 * focused reading block).
 *
 * Renders `content.bodyHtml` (Tiptap-edited rich text) when present, else
 * falls back to the legacy `paragraphs` array — same dual path the
 * photo-grid variant uses, so admin-side content authoring is unchanged.
 */
export function LovebirdStorySection({ content }: LovebirdStorySectionProps) {
  const hasText = Boolean(
    content?.bodyHtml || (content?.paragraphs ?? []).length > 0,
  );
  if (!hasText && !content?.title) return null;

  return (
    <section id="story" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-display text-foreground mb-4">
          {content?.title ?? "Our Story"}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-12" />

        {content?.bodyHtml ? (
          <div
            className="text-foreground/85 text-lg leading-relaxed text-left [&_p]:my-4 [&_p]:text-lg [&_p]:leading-relaxed [&_h2]:text-2xl [&_h2]:font-display [&_h2]:text-center [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-foreground [&_h3]:text-xl [&_h3]:font-serif [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:underline"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is generated server-side by admin via Tiptap editor
            dangerouslySetInnerHTML={{ __html: content.bodyHtml }}
          />
        ) : (
          <div className="text-left space-y-4">
            {(content?.paragraphs ?? []).map((paragraph, i) => (
              // Compose the key from index + content length so identical-prefix
              // paragraphs don't collide (substring-of-paragraph would) and the
              // key isn't a pure index (Biome rejects that, and it'd churn on
              // edits anyway). Order is stable: paragraphs come from server-
              // rendered content with no client-side reordering.
              <p
                key={`para-${i}-${paragraph.length}`}
                className="text-foreground/85 text-lg leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
