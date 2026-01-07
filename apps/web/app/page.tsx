import { Footer } from "@workspace/ui/components/footer";
import { DetailsSection } from "@/components/details-section";
import { HeroSection } from "@/components/hero-section";
import { MainNavigation } from "@/components/main-navigation";
import { RSVPSection } from "@/components/rsvp-section";
import { ScheduleSection } from "@/components/schedule-section";
import { StorySection } from "@/components/story-section";
import { getAllPhotos } from "@/lib/photos";
import { SITE_CONFIG } from "./site-config";
import { pickRandomItems, shuffleArray } from "./utils";

export default async function Page() {
  const photos = await getAllPhotos();

  // Shuffle photos on the server to avoid hydration mismatch
  const heroPhotos = shuffleArray([...photos]);
  const storyPhotos = pickRandomItems([...photos], 3);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Client Component - uses Clerk hooks for admin detection */}
      <MainNavigation />

      <main className="grow">
        {/* Client Component - uses useState/useEffect for carousel */}
        <HeroSection photos={heroPhotos} />

        {/* Server Components - static content */}
        <StorySection photos={storyPhotos} />
        <DetailsSection />
        <ScheduleSection />
        <RSVPSection />
      </main>

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
