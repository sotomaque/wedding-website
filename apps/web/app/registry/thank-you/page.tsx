import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import Link from "next/link";
import { NAVIGATION_CONFIG } from "@/app/navigation-config";
import { SITE_CONFIG } from "@/app/site-config";

export default function RegistryThankYouPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
      />

      <main className="grow flex items-center justify-center">
        <section className="relative overflow-hidden">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-2xl mx-auto text-center">
              <div className="text-6xl mb-8 animate-fade-in-up">💝</div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-6 animate-fade-in-up animation-delay-100">
                Thank You!
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-in-up animation-delay-200">
                Your generosity means the world to us.
              </p>

              <div className="w-24 h-1 bg-accent mx-auto mb-8 animate-fade-in-up animation-delay-300" />

              <p className="text-lg text-muted-foreground leading-relaxed mb-12 animate-fade-in-up animation-delay-400">
                We&apos;re so grateful for your kindness and support as we begin
                this new chapter together. Your gift will help make our dreams a
                reality.
              </p>

              <div className="space-y-4 animate-fade-in-up animation-delay-500">
                <p className="text-muted-foreground mb-6">
                  While you&apos;re here, check out what we have planned:
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/things-to-do"
                    className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Things To Do in San Diego
                  </Link>

                  <Link
                    href="/#schedule"
                    className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors border border-border"
                  >
                    View Wedding Schedule
                  </Link>
                </div>

                <div className="pt-8">
                  <Link
                    href="/"
                    className="text-accent hover:text-accent/80 hover:underline transition-colors"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
