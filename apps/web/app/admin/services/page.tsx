import {
  CreditCard,
  Database,
  ExternalLink,
  Github,
  Mail,
  Shield,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { env } from "@/env";
import {
  getSupabaseConsole,
  SERVICE_CATEGORIES,
  SERVICES,
  type Service,
} from "./constants";

export const dynamic = "force-dynamic";

function getIcon(iconName: string) {
  const iconClass = "h-6 w-6";
  switch (iconName) {
    case "github":
      return <Github className={iconClass} />;
    case "database":
      return <Database className={iconClass} />;
    case "shield":
      return <Shield className={iconClass} />;
    case "credit-card":
      return <CreditCard className={iconClass} />;
    case "mail":
      return <Mail className={iconClass} />;
    case "upload":
      return <Upload className={iconClass} />;
    case "vercel":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="currentColor"
          role="img"
          aria-label="Vercel"
        >
          <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
      );
    default:
      return <ExternalLink className={iconClass} />;
  }
}

function ServiceCard({ service, href }: { service: Service; href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all duration-200 hover:border-primary hover:shadow-lg">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${service.color} text-white transition-transform duration-200 group-hover:scale-110`}
          >
            {getIcon(service.icon)}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{service.title}</h3>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="text-sm text-muted-foreground">
              {service.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ServicesPage() {
  // Get Supabase URL dynamically
  const supabaseUrl = getSupabaseConsole();

  // Group services by category
  const servicesByCategory = SERVICES.reduce(
    (acc, service) => {
      const category = service.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    },
    {} as Record<string, Service[]>,
  );

  // Sort categories by order
  const sortedCategories = Object.entries(servicesByCategory).sort(
    ([a], [b]) => {
      const orderA =
        SERVICE_CATEGORIES[a as keyof typeof SERVICE_CATEGORIES]?.order || 99;
      const orderB =
        SERVICE_CATEGORIES[b as keyof typeof SERVICE_CATEGORIES]?.order || 99;
      return orderA - orderB;
    },
  );

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-4 py-6 sm:px-6 md:px-8 md:py-8 border border-border">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif text-foreground mb-2">
              Developer Services
            </h1>
            <p className="text-muted-foreground">
              Quick access to all external services and dashboards used by this
              application.
            </p>
          </div>

          {/* Services by Category */}
          <div className="space-y-8">
            {sortedCategories.map(([category, services]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="h-1 w-4 rounded-full bg-primary" />
                  {SERVICE_CATEGORIES[
                    category as keyof typeof SERVICE_CATEGORIES
                  ]?.label || category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      href={
                        service.id === "supabase" ? supabaseUrl : service.href
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Environment Info */}
          <div className="mt-10 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Environment
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Environment
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {process.env.NODE_ENV === "production"
                    ? "Production"
                    : "Development"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Stripe Mode
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {env.STRIPE_SECRET_KEY?.startsWith("sk_live")
                    ? "Live"
                    : "Test"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Database
                </p>
                <p className="text-lg font-semibold text-foreground">
                  Supabase PostgreSQL
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Quick Links
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="https://github.com/sotomaque/wedding-website/blob/main/apps/web/.env.example"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Github className="h-4 w-4" />
                .env.example
              </Link>
              <Link
                href="https://github.com/sotomaque/wedding-website/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Github className="h-4 w-4" />
                GitHub Actions
              </Link>
              <Link
                href="https://dashboard.stripe.com/test/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Stripe Webhooks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
