import { SCHEDULE_CONTENT } from "../app/constants";

export function ScheduleSection() {
  return (
    <section id="schedule" className="py-24 px-6 bg-card scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
          {SCHEDULE_CONTENT.title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
        <div className="space-y-8">
          {SCHEDULE_CONTENT.events.map((item) => (
            <div
              key={item.id}
              className="flex gap-6 items-start border-l-2 border-border pl-6"
            >
              <div className="min-w-[100px] pt-1">
                <p className="font-semibold text-foreground">{item.time}</p>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-serif text-foreground mb-1">
                  {item.event}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
