import { Footer } from "@workspace/ui/components/footer";
import { pickRandomItems, shuffleArray } from "@/app/utils";
import { DetailsSection } from "@/components/details-section";
import { HeroSection } from "@/components/hero-section";
import { RSVPSection } from "@/components/rsvp-section";
import { ScheduleSection } from "@/components/schedule-section";
import { StorySection } from "@/components/story-section";
import { WeddingNavigation } from "@/components/wedding-navigation";
import {
  getWeddingContentSections,
  getWeddingSettings,
} from "@/lib/db/wedding-content-data";
import { getAllPhotos } from "@/lib/photos";
import type {
  DetailsContent,
  HeroContent,
  RsvpContent,
  ScheduleContent,
  StoryContent,
} from "@/lib/validations/wedding-content";

export default async function Page() {
  const [photos, content, settings] = await Promise.all([
    getAllPhotos(),
    getWeddingContentSections(),
    getWeddingSettings(),
  ]);

  // Shuffle photos on the server to avoid hydration mismatch
  const heroPhotos = shuffleArray([...photos]);
  const storyPhotos = pickRandomItems([...photos], 3);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <WeddingNavigation />

      <main className="grow">
        {/* Client Component - uses useState/useEffect for carousel */}
        <HeroSection
          photos={heroPhotos}
          title={(content.hero as HeroContent)?.title}
        />

        {/* Server Components - static content */}
        <StorySection
          photos={storyPhotos}
          content={content.story as StoryContent}
        />
        <DetailsSection content={content.details as DetailsContent} />
        <ScheduleSection content={content.schedule as ScheduleContent} />
        <RSVPSection
          content={content.rsvp as RsvpContent}
          contactEmail={settings.contactEmail ?? undefined}
          rsvpDeadline={settings.rsvpDeadline ?? undefined}
        />
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}
