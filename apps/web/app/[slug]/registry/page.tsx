import { Footer } from "@workspace/ui/components/footer";
import { notFound } from "next/navigation";
import { WeddingNavigation } from "@/components/wedding-navigation";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { RegistryCard } from "./registry-card";

export default async function RegistryPage() {
  const [weddingId, settings] = await Promise.all([
    getWeddingId(),
    getWeddingSettings(),
  ]);

  if (!settings.featureToggles.registry) notFound();

  const registryItems = await db.registryItem.findMany({
    where: { weddingId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <WeddingNavigation />

      <main className="grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-card">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-foreground mb-6 animate-fade-in-up">
                Gift Registry
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-in-up animation-delay-100">
                Your presence is the greatest gift, but if you wish to celebrate
                with us...
              </p>
              <div className="w-24 h-1 bg-accent mx-auto mb-8 animate-fade-in-up animation-delay-200" />
              <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in-up animation-delay-300">
                We're grateful to have everything we need to start our life
                together. If you'd like to give a gift, please consider
                contributing to one of these meaningful funds.
              </p>
            </div>
          </div>
        </section>

        {/* Registry Cards Section */}
        <section className="relative bg-secondary">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {registryItems.map((gift, index) => (
                  <RegistryCard key={gift.id} gift={gift} index={index} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Thank You Section */}
        <section className="relative bg-card">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-16">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-muted-foreground text-lg leading-relaxed">
                Thank you for celebrating this special moment with us. Your love
                and support mean more than any gift could express.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}
