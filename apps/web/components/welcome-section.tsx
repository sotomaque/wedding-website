import type { WelcomeContent } from "@/lib/validations/wedding-content";

interface WelcomeSectionProps {
  content?: WelcomeContent;
}

const DEFAULT_TITLE = "Welcome!";
const DEFAULT_MESSAGE =
  "To our friends and family: We're so excited to celebrate our wedding with you. Find all the details you need to know about our big day here.";

/**
 * Welcome section — short greeting paragraph under the hero. Distinct from
 * "Our Story": this is the first under-hero block, kept brief so guests
 * immediately see the tone of voice.
 *
 * Falls back to the default heading + paragraph when no content row exists
 * so brand-new weddings still render something inviting before the user
 * edits.
 */
export function WelcomeSection({ content }: WelcomeSectionProps) {
  const title = content?.title?.trim() || DEFAULT_TITLE;
  const message = content?.message?.trim() || DEFAULT_MESSAGE;

  return (
    <section id="welcome" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          {title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-12" />
        <p className="text-foreground/90 text-lg md:text-xl leading-relaxed">
          {message}
        </p>
      </div>
    </section>
  );
}
