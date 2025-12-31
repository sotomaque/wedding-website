"use client";

import { Button } from "@workspace/ui/components/button";
import Image from "next/image";
import Link from "next/link";
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
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <h3 className="text-2xl font-serif text-foreground">
                  Please RSVP with your invite code
                </h3>
                <p className="text-muted-foreground">
                  Your unique invite code was included in your invitation email.
                  This ensures we can properly track your RSVP and any dietary
                  preferences.
                </p>
              </div>

              <div className="bg-secondary/50 p-6 rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-2">
                  Your invite code looks like:
                </p>
                <p className="text-2xl font-mono font-bold text-accent tracking-wider">
                  ABCD-1234
                </p>
              </div>

              <Link href="/rsvp">
                <Button size="lg" className="w-full font-semibold">
                  Go to RSVP Page
                </Button>
              </Link>

              <p className="text-sm text-muted-foreground mt-4">
                Don't have an invite code?{" "}
                <a
                  href="mailto:sotomaque@gmail.com"
                  className="text-accent hover:underline font-medium"
                >
                  Contact us
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
