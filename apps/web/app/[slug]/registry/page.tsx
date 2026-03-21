import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import { NAVIGATION_CONFIG } from "@/app/navigation-config";
import { SITE_CONFIG } from "@/app/site-config";
import { REGISTRY_CONTENT } from "./constants";
import { RegistryCard } from "./registry-card";

export default function RegistryPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
      />

      <main className="grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-card">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-foreground mb-6 animate-fade-in-up">
                {REGISTRY_CONTENT.title}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-in-up animation-delay-100">
                {REGISTRY_CONTENT.subtitle}
              </p>
              <div className="w-24 h-1 bg-accent mx-auto mb-8 animate-fade-in-up animation-delay-200" />
              <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in-up animation-delay-300">
                {REGISTRY_CONTENT.intro}
              </p>
            </div>
          </div>
        </section>

        {/* Registry Cards Section */}
        <section className="relative bg-secondary">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {REGISTRY_CONTENT.gifts.map((gift, index) => (
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

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
