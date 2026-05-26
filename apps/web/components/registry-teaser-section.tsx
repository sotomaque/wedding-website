import { Globe } from "lucide-react";

interface TeaserRegistryItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  emoji: string | null;
  stripeUrl: string | null;
}

interface RegistryTeaserSectionProps {
  items: TeaserRegistryItem[];
}

/**
 * Registry section, Lovebird-style. Flat vertical list of registry items —
 * no card wrapper, no grid — each block is a bold-serif title + description
 * + outlined "Website" CTA. Matches the way Lovebird inlines the entire
 * registry on the home page rather than teasing to a sub-route.
 */
export function RegistryTeaserSection({ items }: RegistryTeaserSectionProps) {
  return (
    <section id="registry" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Registry
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="divide-y divide-foreground/15">
          {items.map((item) => (
            <article key={item.id} className="py-10 first:pt-0 last:pb-0">
              <h3 className="font-serif font-semibold text-foreground text-2xl md:text-3xl mb-3">
                {item.title}
              </h3>

              {item.description && (
                <p className="text-foreground/85 text-lg leading-relaxed mb-5">
                  {item.description}
                </p>
              )}

              {item.stripeUrl && (
                <a
                  href={item.stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-foreground/60 text-foreground text-sm hover:bg-foreground/10 transition-colors"
                >
                  <Globe
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.5}
                  />
                  Website
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
