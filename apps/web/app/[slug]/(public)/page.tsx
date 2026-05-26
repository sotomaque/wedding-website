import { Footer } from "@workspace/ui/components/footer";
import { getLocale, getTranslations } from "next-intl/server";
import { pickRandomItems, shuffleArray } from "@/app/utils";
import { DetailsSection } from "@/components/details-section";
import { HeroSection } from "@/components/hero-section";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RSVPSection } from "@/components/rsvp-section";
import { ScheduleSection } from "@/components/schedule-section";
import { StorySection } from "@/components/story-section";
import { WeddingNavigation } from "@/components/wedding-navigation";
import type { Locale } from "@/i18n/config";
import {
  getCeremonyAndReception,
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
  const [photos, content, settings, venueDerived, t, locale] =
    await Promise.all([
      getAllPhotos(),
      getWeddingContentSections(),
      getWeddingSettings(),
      getCeremonyAndReception(),
      getTranslations("footer"),
      getLocale(),
    ]);

  // Shuffle photos on the server to avoid hydration mismatch
  const heroPhotos = shuffleArray([...photos]);
  const storyPhotos = pickRandomItems([...photos], 3);

  const detailsContent = content.details as DetailsContent | undefined;
  const weddingDateFormatted =
    detailsContent?.dateFormatted ??
    settings.weddingDate.toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  // Ceremony / reception come from the events table (single source of
  // truth); fall back to whatever was stored in content for weddings that
  // pre-date this change.
  const detailsContentWithEvents: DetailsContent | undefined = detailsContent
    ? {
        ...detailsContent,
        ceremony: venueDerived.ceremony ?? detailsContent.ceremony,
        reception: venueDerived.reception ?? detailsContent.reception,
      }
    : undefined;

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
        <DetailsSection content={detailsContentWithEvents} />
        <ScheduleSection
          content={content.schedule as ScheduleContent}
          weddingDateFormatted={weddingDateFormatted}
        />
        <RSVPSection
          content={content.rsvp as RsvpContent}
          contactEmail={settings.contactEmail ?? undefined}
          rsvpDeadline={settings.rsvpDeadline ?? undefined}
        />
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
        translations={{
          celebration: t("celebration"),
          contact: t("contact"),
        }}
        languageSwitcher={<LanguageSwitcher currentLocale={locale as Locale} />}
      />
    </div>
  );
}
