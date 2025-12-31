"use client";

import { Footer } from "@workspace/ui/components/footer";
import { useActiveSection } from "@workspace/ui/hooks/use-active-section";
import { DetailsSection } from "../components/details-section";
import { HeroSection } from "../components/hero-section";
import { MainNavigation } from "../components/main-navigation";
import { RSVPSection } from "../components/rsvp-section";
import { ScheduleSection } from "../components/schedule-section";
import { StorySection } from "../components/story-section";
import { SITE_CONFIG } from "./site-config";

export default function Page() {
  const activeSection = useActiveSection();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <MainNavigation activeSection={activeSection} />

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
