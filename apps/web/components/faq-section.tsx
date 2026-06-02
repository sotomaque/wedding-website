import type { FaqsContent } from "@/lib/validations/wedding-content";

/**
 * Home-section FAQs, Elegant-style. Flat list of question/answer pairs —
 * not collapsible — with the question in bold serif and the answer in cream
 * prose. Elegant's design keeps everything visible so guests skim the
 * whole FAQ at once rather than expanding items.
 *
 * WYSIWYG: renders exactly the wedding's `faqs` content (what the admin
 * sees in the editor). Returns `null` when there is no content or the items
 * list is empty so the layout iteration skips the section (matches the
 * gallery-empty pattern).
 */

const DEFAULT_TITLE = "FAQs";

interface FaqSectionProps {
  content?: FaqsContent;
}

export function FaqSection({ content }: FaqSectionProps) {
  const title = content?.title?.trim() || DEFAULT_TITLE;

  if (!content || content.items.length === 0) {
    return null;
  }

  const items = content.items;

  return (
    <section id="faqs" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          {title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />
        <div className="space-y-8">
          {items.map((faq) => (
            <div key={faq.id}>
              <h3 className="font-serif font-semibold text-foreground text-lg md:text-xl mb-2">
                {faq.question}
              </h3>
              <p className="text-foreground/85 text-lg leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
