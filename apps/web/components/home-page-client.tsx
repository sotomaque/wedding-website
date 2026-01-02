"use client";

import { Footer } from "@workspace/ui/components/footer";

import type { HeroPhoto } from "@/app/constants";
import { SITE_CONFIG } from "@/app/site-config";
import { DetailsSection } from "./details-section";
import { HeroSection } from "./hero-section";
import { MainNavigation } from "./main-navigation";
import { RSVPSection } from "./rsvp-section";
import { ScheduleSection } from "./schedule-section";
import { StorySection } from "./story-section";

interface HomePageClientProps {
  heroPhotos: HeroPhoto[];
  storyPhotos: HeroPhoto[];
}

export function HomePageClient({
  heroPhotos,
  storyPhotos,
}: HomePageClientProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <MainNavigation />

      <main className="grow">
        <HeroSection photos={heroPhotos} />
        <StorySection photos={storyPhotos} />
        <DetailsSection />
        <ScheduleSection />
        <RSVPSection />
      </main>

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
