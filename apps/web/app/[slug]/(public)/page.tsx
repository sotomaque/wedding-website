import { Footer } from "@workspace/ui/components/footer";
import { MotifDivider } from "@workspace/ui/components/motifs";
import { getLocale, getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";
import { pickRandomItems, shuffleArray } from "@/app/utils";
import { DetailsSection } from "@/components/details-section";
import { FaqSection } from "@/components/faq-section";
import { GallerySection } from "@/components/gallery-section";
import { HeroSection } from "@/components/hero-section";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LovebirdHeroSection } from "@/components/lovebird-hero-section";
import { LovebirdScheduleSection } from "@/components/lovebird-schedule-section";
import { LovebirdStorySection } from "@/components/lovebird-story-section";
import { RegistryTeaserSection } from "@/components/registry-teaser-section";
import { RSVPSection } from "@/components/rsvp-section";
import { ScheduleSection } from "@/components/schedule-section";
import { StorySection } from "@/components/story-section";
import { ThingsToDoTeaserSection } from "@/components/things-to-do-teaser-section";
import { TravelTeaserSection } from "@/components/travel-teaser-section";
import { WeddingNavigation } from "@/components/wedding-navigation";
import { WeddingPartySection } from "@/components/wedding-party-section";
import { WelcomeSection } from "@/components/welcome-section";
import type { Locale } from "@/i18n/config";
import {
  getActiveRegistryItems,
  getCeremonyAndReception,
  getEvents,
  getHotels,
  getTeaserActivities,
  getWeddingContentSections,
  getWeddingSettings,
} from "@/lib/db/wedding-content-data";
import { getLayoutPreset, type SectionKey } from "@/lib/layouts";
import { getAllPhotos } from "@/lib/photos";
import { getTemplatePreset } from "@/lib/templates";
import type {
  DetailsContent,
  HeroContent,
  RsvpContent,
  ScheduleContent,
  StoryContent,
} from "@/lib/validations/wedding-content";

export default async function Page() {
  // Top-level fetches — settings is needed to decide whether to fetch
  // registry items, so it kicks off in this first wave with everything
  // else that doesn't depend on it.
  const [photos, content, settings, venueDerived, t, locale] =
    await Promise.all([
      getAllPhotos(),
      getWeddingContentSections(),
      getWeddingSettings(),
      getCeremonyAndReception(),
      getTranslations("footer"),
      getLocale(),
    ]);

  // Teaser data — each accessor is React.cache-wrapped in
  // wedding-content-data.ts so any sibling component that needs the same
  // data hits the cache instead of re-querying. Omitting empty teasers
  // happens in the section map below.
  const [hotels, activities, registryItems, scheduleEvents] = await Promise.all(
    [
      getHotels(),
      getTeaserActivities(),
      settings.featureToggles.registry
        ? getActiveRegistryItems()
        : Promise.resolve([]),
      // Events feed the Lovebird-style schedule (richer than ScheduleContent's
      // flat {time, event, description}). Classic uses ScheduleContent and
      // ignores this — but getCeremonyAndReception above also reads events,
      // and both calls share a single DB roundtrip via React.cache.
      getEvents(),
    ],
  );

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

  // Resolve the chosen template → layout + motif. The template bundles both
  // (templates supersede independent layout/motif picks). Null templateId
  // falls back to the "classic" preset so existing weddings render unchanged.
  const template = getTemplatePreset(settings.templateId);
  const layout = getLayoutPreset(template.layoutId);
  const motifId = template.motifId;

  // Hashtag derivation: prefer the alphanumeric-stripped couple name + year
  // (e.g. "helenandenrique2026"), but fall back to the slug for couple names
  // that strip to empty (any non-Latin script like "山田 & 佐藤"). The slug is
  // ASCII-safe by construction.
  const nameStripped = settings.coupleName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const hashtagBase = nameStripped || settings.slug.replace(/-/g, "");
  const hashtag = `${hashtagBase}${settings.weddingDate.getFullYear()}`;

  // Section registry — each key maps to its rendered component with the same
  // props as before. The layout template decides which sections appear and
  // in what order; each component keeps its own anchor id for nav links.
  // Lovebird-style section keys (wedding-party, gallery, things-to-do,
  // travel-teaser, registry-teaser, faqs) render `null` for now — their
  // backing components and data models ship in Phase 2 (teasers) and
  // Phase 3 (new CRUD features). Until then they leave a quiet empty slot
  // in the Lovebird layout rather than break the page.
  const sectionMap: Record<SectionKey, ReactNode> = {
    // Two hero variants:
    //   - "couple-names" (Lovebird-style): contained photo + dark card with
    //     script names, M | D | YYYY date, location, live countdown.
    //   - "title" (Classic): full-bleed carousel + uppercase title overlay.
    hero:
      template.heroDisplay === "couple-names" ? (
        <LovebirdHeroSection
          photos={heroPhotos}
          coupleNamesDisplay={settings.coupleName}
          weddingDateIso={settings.weddingDate.toISOString()}
          weddingDateFormatted={settings.weddingDate
            .toLocaleDateString(locale, {
              month: "numeric",
              day: "numeric",
              year: "numeric",
            })
            .replace(/\//g, " | ")}
          location={(content.hero as HeroContent)?.location}
        />
      ) : (
        <HeroSection
          photos={heroPhotos}
          title={(content.hero as HeroContent)?.title}
        />
      ),
    // Server Components - static content
    story:
      template.storyStyle === "prose-only" ? (
        <LovebirdStorySection content={content.story as StoryContent} />
      ) : (
        <StorySection
          photos={storyPhotos}
          content={content.story as StoryContent}
        />
      ),
    details: <DetailsSection content={detailsContentWithEvents} />,
    schedule:
      template.scheduleStyle === "events-card" ? (
        <LovebirdScheduleSection events={scheduleEvents} locale={locale} />
      ) : (
        <ScheduleSection
          content={content.schedule as ScheduleContent}
          weddingDateFormatted={weddingDateFormatted}
        />
      ),
    rsvp: (
      <RSVPSection
        content={content.rsvp as RsvpContent}
        contactEmail={settings.contactEmail ?? undefined}
        rsvpDeadline={settings.rsvpDeadline ?? undefined}
      />
    ),
    // Lovebird-style sections — data-driven where backing tables exist
    // (hotels, activities, registry, photos), hardcoded placeholders where
    // they don't (welcome + wedding-party + faqs ship Phase 3). null = "no
    // data, skip this slot entirely" — the layout iteration filters them
    // out so we don't leave stray motif dividers between empty rows.
    welcome: <WelcomeSection hashtag={hashtag} />,
    "wedding-party": <WeddingPartySection />,
    gallery: photos.length > 0 ? <GallerySection photos={photos} /> : null,
    "things-to-do":
      activities.length > 0 ? (
        <ThingsToDoTeaserSection activities={activities} />
      ) : null,
    "travel-teaser":
      hotels.length > 0 ? <TravelTeaserSection hotels={hotels} /> : null,
    "registry-teaser":
      registryItems.length > 0 ? (
        <RegistryTeaserSection items={registryItems} />
      ) : null,
    faqs: <FaqSection />,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <WeddingNavigation variant={layout.navVariant} />

      <main className="grow">
        {/* Filter out placeholder (null) sections so we don't render stray
            motif dividers around empty slots — Phase 1 ships several
            Lovebird-only sections that aren't built yet. */}
        {layout.sections
          .filter((key) => sectionMap[key] !== null)
          .map((key, index) => (
            <Fragment key={key}>
              {/* Decorative divider between sections (skipped before the first). */}
              {index > 0 && <MotifDivider motifId={motifId} />}
              {sectionMap[key]}
            </Fragment>
          ))}
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
