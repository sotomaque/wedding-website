"use client";

import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import { useActiveSection } from "@workspace/ui/hooks/use-active-section";
import { DetailsSection } from "../components/details-section";
import { HeroSection } from "../components/hero-section";
import { RSVPSection } from "../components/rsvp-section";
import { ScheduleSection } from "../components/schedule-section";
import { StorySection } from "../components/story-section";
import { NAVIGATION_CONFIG } from "./navigation-config";
import { SITE_CONFIG } from "./site-config";

export default function Page() {
  const activeSection = useActiveSection();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
        activeSection={activeSection}
      />

      <main className="grow">
        <HeroSection />
        <StorySection />
        <DetailsSection />
        <ScheduleSection />
        <RSVPSection />
      </main>

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
