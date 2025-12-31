import { DETAILS_CONTENT } from "../app/constants";

export function DetailsSection() {
  return (
    <section id="details" className="py-24 px-6 bg-secondary scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
          {DETAILS_CONTENT.title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
        <div className="grid md:grid-cols-2 gap-8">
          {/* Ceremony */}
          <div className="bg-card p-8 rounded-lg shadow-sm border border-accent/30">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4 text-3xl">
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
          <div className="bg-card p-8 rounded-lg shadow-sm border border-accent/30">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4 text-3xl">
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
        <div className="mt-12 bg-card p-8 rounded-lg shadow-sm border border-accent/30">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {DETAILS_CONTENT.additionalInfo.map((info) => (
              <div key={info.title}>
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
