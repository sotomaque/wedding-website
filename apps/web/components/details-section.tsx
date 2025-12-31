"use client";

import { DETAILS_CONTENT } from "../app/constants";
import { useInView } from "../hooks/use-in-view";

export function DetailsSection() {
  const { ref: sectionRef, isInView: sectionInView } = useInView({
    threshold: 0.1,
  });
  const { ref: cardsRef, isInView: cardsInView } = useInView({
    threshold: 0.2,
  });
  const { ref: additionalRef, isInView: additionalInView } = useInView({
    threshold: 0.2,
  });

  return (
    <section id="details" className="py-24 px-6 bg-secondary scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <div
          ref={sectionRef}
          className={`transition-all duration-700 ease-out ${
            sectionInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-serif text-center mb-4 text-foreground">
            {DETAILS_CONTENT.title}
          </h2>
          <p className="text-xl md:text-2xl text-center text-muted-foreground mb-16">
            {DETAILS_CONTENT.date}
          </p>
          <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
        </div>

        <div ref={cardsRef} className="grid md:grid-cols-2 gap-8">
          {/* Ceremony */}
          <div
            className={`bg-card p-8 rounded-lg shadow-sm border border-accent/30
              transition-all duration-500 ease-out delay-100
              hover:shadow-lg hover:border-accent/50 hover:-translate-y-1
              ${
                cardsInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
          >
            <div className="text-center space-y-4">
              <div
                className={`w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4 text-3xl
                  transition-transform duration-300 hover:scale-110`}
              >
                {DETAILS_CONTENT.ceremony.icon}
              </div>
              <h3 className="text-2xl font-serif text-foreground">
                {DETAILS_CONTENT.ceremony.title}
              </h3>
              <div className="text-muted-foreground space-y-2">
                <p className="font-medium">{DETAILS_CONTENT.ceremony.time}</p>
                <p>{DETAILS_CONTENT.ceremony.venue}</p>
                <p className="text-sm">{DETAILS_CONTENT.ceremony.location}</p>
                <p className="text-sm">{DETAILS_CONTENT.ceremony.address}</p>
              </div>
            </div>
          </div>

          {/* Reception */}
          <div
            className={`bg-card p-8 rounded-lg shadow-sm border border-accent/30
              transition-all duration-500 ease-out delay-200
              hover:shadow-lg hover:border-accent/50 hover:-translate-y-1
              ${
                cardsInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
          >
            <div className="text-center space-y-4">
              <div
                className={`w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4 text-3xl
                  transition-transform duration-300 hover:scale-110`}
              >
                {DETAILS_CONTENT.reception.icon}
              </div>
              <h3 className="text-2xl font-serif text-foreground">
                {DETAILS_CONTENT.reception.title}
              </h3>
              <div className="text-muted-foreground space-y-2">
                <p className="font-medium">{DETAILS_CONTENT.reception.time}</p>
                <p>{DETAILS_CONTENT.reception.venue}</p>
                <p className="text-sm">{DETAILS_CONTENT.reception.address}</p>
                <p className="text-sm">
                  {DETAILS_CONTENT.reception.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attire & Additional Info */}
        <div
          ref={additionalRef}
          className={`mt-12 bg-card p-8 rounded-lg shadow-sm border border-accent/30
            transition-all duration-500 ease-out delay-300
            hover:shadow-lg hover:border-accent/50
            ${
              additionalInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
        >
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {DETAILS_CONTENT.additionalInfo.map((info, index) => (
              <div
                key={info.title}
                className={`transition-all duration-500 ease-out
                  ${
                    additionalInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                style={{ transitionDelay: `${400 + index * 100}ms` }}
              >
                <h4 className="font-semibold text-foreground mb-2">
                  {info.title}
                </h4>
                <p className="text-muted-foreground text-sm">
                  {info.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
