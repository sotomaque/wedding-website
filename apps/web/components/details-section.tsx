import Link from "next/link";
import type { DetailsContent } from "@/lib/validations/wedding-content";

interface DetailsSectionProps {
  content?: DetailsContent;
}

export function DetailsSection({ content }: DetailsSectionProps) {
  if (!content) return null;

  return (
    <section id="details" className="py-24 px-6 bg-secondary scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <div className="animate-fade-in-up">
          <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
            {content.title}
          </h2>
          <p className="text-xl md:text-2xl text-center text-muted-foreground mb-16">
            {content.dateFormatted}
          </p>
          <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ceremony */}
          {content.ceremony && (
            <div
              className="bg-card p-8 rounded-lg shadow-sm border border-accent/30
                transition-all duration-500 ease-out
                hover:shadow-lg hover:border-accent/50 hover:-translate-y-1
                animate-fade-in-up animation-delay-100"
            >
              <div className="text-center space-y-4">
                {content.ceremony.icon && (
                  <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4 text-3xl transition-transform duration-300 hover:scale-110">
                    {content.ceremony.icon}
                  </div>
                )}
                <h3 className="text-2xl font-serif text-foreground">
                  {content.ceremony.title}
                </h3>
                <div className="text-muted-foreground space-y-2">
                  {content.ceremony.time && (
                    <p className="font-medium">{content.ceremony.time}</p>
                  )}
                  <p>{content.ceremony.venue}</p>
                  {content.ceremony.location && (
                    <p className="text-sm">{content.ceremony.location}</p>
                  )}
                  {content.ceremony.address && (
                    <p className="text-sm">{content.ceremony.address}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reception */}
          {content.reception && (
            <div
              className="bg-card p-8 rounded-lg shadow-sm border border-accent/30
                transition-all duration-500 ease-out
                hover:shadow-lg hover:border-accent/50 hover:-translate-y-1
                animate-fade-in-up animation-delay-200"
            >
              <div className="text-center space-y-4">
                {content.reception.icon && (
                  <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4 text-3xl transition-transform duration-300 hover:scale-110">
                    {content.reception.icon}
                  </div>
                )}
                <h3 className="text-2xl font-serif text-foreground">
                  {content.reception.title}
                </h3>
                <div className="text-muted-foreground space-y-2">
                  {content.reception.time && (
                    <p className="font-medium">{content.reception.time}</p>
                  )}
                  <p>{content.reception.venue}</p>
                  {content.reception.address && (
                    <p className="text-sm">{content.reception.address}</p>
                  )}
                  {content.reception.description && (
                    <p className="text-sm">{content.reception.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attire & Additional Info */}
        <div
          className="mt-12 bg-card p-8 rounded-lg shadow-sm border border-accent/30
            transition-all duration-500 ease-out
            hover:shadow-lg hover:border-accent/50
            animate-fade-in-up animation-delay-300"
        >
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {(content.additionalInfo ?? []).map((info, index) => (
              <div
                key={info.title}
                className="animate-fade-in-up"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <h4 className="font-semibold text-foreground mb-2">
                  {info.title}
                </h4>
                {"href" in info && info.href ? (
                  <Link
                    href={info.href}
                    className="text-accent hover:text-accent/80 hover:underline text-sm font-medium transition-colors"
                  >
                    {info.description}
                  </Link>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {info.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
