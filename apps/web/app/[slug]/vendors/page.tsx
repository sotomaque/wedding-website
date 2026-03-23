import { Footer } from "@workspace/ui/components/footer";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { MainNavigation } from "@/components/main-navigation";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import type { ServiceLinkCategory } from "../admin/vendors/actions";
import { getServiceLinks } from "../admin/vendors/actions";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  getFaviconUrl,
} from "../admin/vendors/constants";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const [links, settings] = await Promise.all([
    getServiceLinks(),
    getWeddingSettings(),
  ]);

  if (!settings.featureToggles.vendors) notFound();

  // Group by category, preserving sort_order within each group
  const grouped = CATEGORIES.reduce<Record<ServiceLinkCategory, typeof links>>(
    (acc, cat) => {
      acc[cat.value] = links.filter((l) => l.category === cat.value);
      return acc;
    },
    {} as Record<ServiceLinkCategory, typeof links>,
  );

  const categoriesWithLinks = CATEGORIES.filter(
    (cat) => (grouped[cat.value]?.length ?? 0) > 0,
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation />

      <main className="grow">
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-3">
              Vendors & Services
            </h1>
            <p className="text-muted-foreground">
              Our trusted vendors and service providers
            </p>
          </div>

          {links.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              No vendors listed yet.
            </p>
          ) : (
            <div className="space-y-10">
              {categoriesWithLinks.map((cat) => (
                <section key={cat.value}>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 border-b pb-2">
                    {cat.label}
                  </h2>
                  <div className="space-y-3">
                    {(grouped[cat.value] ?? []).map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border hover:bg-secondary/30 transition-colors group"
                      >
                        <img
                          src={getFaviconUrl(link.url)}
                          alt=""
                          className="h-6 w-6 rounded shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {link.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[link.category]}`}
                            >
                              {cat.label}
                            </span>
                          </div>
                          {link.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {link.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {link.url}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}
