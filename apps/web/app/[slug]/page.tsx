import { Footer } from "@workspace/ui/components/footer";
import { SITE_CONFIG } from "@/app/site-config";
import { pickRandomItems, shuffleArray } from "@/app/utils";
import { DetailsSection } from "@/components/details-section";
import { HeroSection } from "@/components/hero-section";
import { MainNavigation } from "@/components/main-navigation";
import { RSVPSection } from "@/components/rsvp-section";
import { ScheduleSection } from "@/components/schedule-section";
import { StorySection } from "@/components/story-section";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getAllPhotos } from "@/lib/photos";

export default async function Page() {
  const [photos, weddingId] = await Promise.all([
    getAllPhotos(),
    getWeddingId(),
  ]);
  const adminResult = await isAdmin(weddingId);

  // Shuffle photos on the server to avoid hydration mismatch
  const heroPhotos = shuffleArray([...photos]);
  const storyPhotos = pickRandomItems([...photos], 3);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation isAdmin={adminResult.authorized} />

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
