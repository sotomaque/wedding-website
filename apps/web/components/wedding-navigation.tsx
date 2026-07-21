import type { NavVariant } from "@workspace/ui/components/navigation";
import { getTranslations } from "next-intl/server";
import { getNavigationConfig } from "@/app/navigation-config";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { MainNavigation } from "./main-navigation";

/**
 * Server component wrapper for MainNavigation that automatically
 * loads wedding settings and passes the correct navConfig with
 * feature toggles and i18n labels applied.
 */
export async function WeddingNavigation({ variant }: { variant?: NavVariant }) {
  const [weddingId, settings, t] = await Promise.all([
    getWeddingId(),
    getWeddingSettings(),
    getTranslations("nav"),
  ]);
  const adminResult = await isAdmin(weddingId);
  const navConfig = getNavigationConfig(settings.slug, {
    brandImage: { url: settings.brandImageUrl, alt: settings.brandImageAlt },
    featureToggles: settings.featureToggles,
    labels: {
      ourStory: t("ourStory"),
      details: t("details"),
      schedule: t("schedule"),
      planning: t("planning"),
      itinerary: t("itinerary"),
      thingsToDo: t("thingsToDo"),
      hotels: t("hotels"),
      tripPlanner: t("tripPlanner"),
      registry: t("registry"),
      rsvp: t("rsvp"),
    },
  });

  return (
    <MainNavigation
      isAdmin={adminResult.authorized}
      navConfig={navConfig}
      variant={variant}
    />
  );
}
