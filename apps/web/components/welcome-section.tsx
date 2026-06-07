import type { WelcomeContent } from "@/lib/validations/wedding-content";

interface WelcomeSectionProps {
  content?: WelcomeContent;
}

/**
 * Welcome section — short greeting paragraph under the hero. Hidden when there
 * is no message: the public page injects the template default message on draft
 * sites (so the couple previews a populated section) and leaves it empty on
 * published sites (so guests never see sample copy). See
 * `resolveWelcomeContent` in lib/template-content-defaults.ts.
 */
export function WelcomeSection({ content }: WelcomeSectionProps) {
  const message = content?.message?.trim();
  if (!message) return null;
  const title = content?.title?.trim() || "Welcome";

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
