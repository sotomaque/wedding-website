import { getNavigationConfig } from "@/app/navigation-config";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { MainNavigation } from "./main-navigation";

/**
 * Server component wrapper for MainNavigation that automatically
 * loads wedding settings and passes the correct navConfig with
 * feature toggles applied.
 */
export async function WeddingNavigation() {
  const [weddingId, settings] = await Promise.all([
    getWeddingId(),
    getWeddingSettings(),
  ]);
  const adminResult = await isAdmin(weddingId);
  const navConfig = getNavigationConfig(settings.slug, {
    brandImage: { url: settings.brandImageUrl, alt: settings.brandImageAlt },
    featureToggles: settings.featureToggles,
  });

  return (
    <MainNavigation isAdmin={adminResult.authorized} navConfig={navConfig} />
  );
}
