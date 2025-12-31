import { Button } from "@workspace/ui/components/button";
import Image from "next/image";
import { RSVP_CONTENT } from "../app/constants";

export function RSVPSection() {
  return (
    <section id="rsvp" className="py-24 px-6 bg-secondary scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-6 text-foreground">
          {RSVP_CONTENT.title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-6" />
        <p className="text-muted-foreground text-center mb-12">
          {RSVP_CONTENT.deadline}
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative aspect-[4/5] rounded-lg overflow-hidden order-2 md:order-1">
            <Image
              src={RSVP_CONTENT.image.src}
              alt={RSVP_CONTENT.image.alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border order-1 md:order-2">
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-left">
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {RSVP_CONTENT.form.firstName.label}
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                    placeholder={RSVP_CONTENT.form.firstName.placeholder}
                  />
                </div>
                <div className="text-left">
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {RSVP_CONTENT.form.lastName.label}
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                    placeholder={RSVP_CONTENT.form.lastName.placeholder}
                  />
                </div>
              </div>
              <div className="text-left">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {RSVP_CONTENT.form.email.label}
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                  placeholder={RSVP_CONTENT.form.email.placeholder}
                />
              </div>
              <div className="text-left">
                <label
                  htmlFor="attending"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {RSVP_CONTENT.form.attending.label}
                </label>
                <select
                  id="attending"
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                >
                  {RSVP_CONTENT.form.attending.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="text-left">
                <label
                  htmlFor="guestCount"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {RSVP_CONTENT.form.guestCount.label}
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min={RSVP_CONTENT.form.guestCount.min}
                  max={RSVP_CONTENT.form.guestCount.max}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                  placeholder={RSVP_CONTENT.form.guestCount.placeholder}
                />
              </div>
              <div className="text-left">
                <label
                  htmlFor="dietary"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {RSVP_CONTENT.form.dietary.label}
                </label>
                <textarea
                  id="dietary"
                  rows={RSVP_CONTENT.form.dietary.rows}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                  placeholder={RSVP_CONTENT.form.dietary.placeholder}
                />
              </div>
              <Button size="lg" className="w-full font-semibold">
                {RSVP_CONTENT.form.submitButton}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
