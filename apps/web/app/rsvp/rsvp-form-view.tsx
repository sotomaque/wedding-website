"use client";

import { useUser } from "@clerk/nextjs";
import { Navigation } from "@workspace/ui/components/navigation";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Database } from "@/lib/supabase/types";
import { DETAILS_CONTENT, RSVP_CONTENT } from "../constants";
import { NAVIGATION_CONFIG } from "../navigation-config";
import { linkClerkUserToGuestAction } from "./actions";
import { RSVPForm } from "./rsvp-form";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface RSVPFormViewProps {
  guests: Guest[];
  inviteCode: string;
}

export function RSVPFormView({ guests, inviteCode }: RSVPFormViewProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const hasLinked = useRef(false);

  // Link Clerk user to guest when they arrive at the form (after sign-in redirect)
  useEffect(() => {
    if (isLoaded && user && !hasLinked.current) {
      hasLinked.current = true;
      linkClerkUserToGuestAction(inviteCode);
    }
  }, [isLoaded, user, inviteCode]);

  function handleBack() {
    router.push("/rsvp");
  }

  return (
    <>
      {/* Mobile: Full-screen form layout */}
      <div className="md:hidden h-dvh fixed inset-0 flex flex-col bg-background overflow-hidden overscroll-none">
        {/* Navigation */}
        <div className="flex-shrink-0">
          <Navigation
            brandImage={NAVIGATION_CONFIG.brandImage}
            leftLinks={NAVIGATION_CONFIG.leftLinks}
            rightLinks={NAVIGATION_CONFIG.rightLinks}
          />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 pt-6 pb-4 px-4 border-b border-border bg-card">
          <h1 className="text-2xl font-serif text-center mb-2">
            {RSVP_CONTENT.title}
          </h1>
          <p className="text-sm text-center text-muted-foreground mb-1">
            {DETAILS_CONTENT.date}
          </p>
          <p className="text-xs text-center text-muted-foreground">
            {RSVP_CONTENT.deadline}
          </p>
          <p className="text-center mt-2">
            <Link
              href="/#details"
              className="text-sm text-primary hover:text-primary/80 underline font-medium"
            >
              View Wedding Details
            </Link>
          </p>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <RSVPForm
            guests={guests}
            inviteCode={inviteCode}
            onBack={handleBack}
          />
        </div>
      </div>

      {/* Desktop: Card on blurred background with side-by-side image */}
      <div className="hidden md:block min-h-screen relative">
        {/* Background Image */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <Image
            src="/table-6.png"
            alt=""
            fill
            className="object-cover blur-sm brightness-[0.85] scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Navigation */}
        <Navigation
          brandImage={NAVIGATION_CONFIG.brandImage}
          leftLinks={NAVIGATION_CONFIG.leftLinks}
          rightLinks={NAVIGATION_CONFIG.rightLinks}
        />

        {/* Content */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <h1 className="text-4xl md:text-5xl font-serif text-center mb-4 text-white drop-shadow-lg">
              {RSVP_CONTENT.title}
            </h1>
            <p className="text-xl md:text-2xl text-center text-white/90 mb-2 drop-shadow-md">
              {DETAILS_CONTENT.date}
            </p>
            <div className="w-24 h-1 bg-white/80 mx-auto mb-4" />
            <p className="text-white/80 text-center mb-4 drop-shadow-md">
              {RSVP_CONTENT.deadline}
            </p>
            <p className="text-center mb-8">
              <Link
                href="/#details"
                className="text-white hover:text-white/80 underline font-medium drop-shadow-md"
              >
                View Wedding Details
              </Link>
            </p>

            {/* Two Column Layout - aligned at top */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Image - Left Side */}
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden max-h-[600px]">
                <Image
                  src={RSVP_CONTENT.image.src}
                  alt={RSVP_CONTENT.image.alt}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Form - Right Side */}
              <div className="bg-card p-8 rounded-lg shadow-sm border border-border">
                {/* Things to Do Link */}
                <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                  <p className="text-sm text-center text-foreground">
                    Planning your trip to San Diego?{" "}
                    <Link
                      href={`/things-to-do?code=${inviteCode}`}
                      className="font-semibold underline hover:text-accent transition-colors"
                    >
                      Check out Things to Do
                    </Link>
                  </p>
                </div>

                <RSVPForm
                  guests={guests}
                  inviteCode={inviteCode}
                  onBack={handleBack}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
