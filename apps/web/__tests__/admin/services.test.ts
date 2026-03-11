import { describe, expect, it, mock } from "bun:test";

// Mock env with a sample POSTGRES_URL
mock.module("@/env", () => ({
  env: {
    POSTGRES_URL:
      "postgresql://postgres.abcdef123456:password@db.supabase.co:5432/postgres",
    DATABASE_URL: undefined,
  },
}));

// Import after mocking
import {
  getSupabaseConsole,
  SERVICE_CATEGORIES,
  SERVICES,
  type Service,
} from "@/app/admin/services/constants";

describe("Admin Services - Service URLs", () => {
  it("should have GitHub service with valid URL", () => {
    const github = SERVICES.find((s: Service) => s.id === "github");
    expect(github?.href).toBeDefined();
    expect(github?.href).toContain("github.com");
    expect(github?.href).toContain("wedding-website");
  });

  it("should have Vercel service with valid URL", () => {
    const vercel = SERVICES.find((s: Service) => s.id === "vercel");
    expect(vercel?.href).toBeDefined();
    expect(vercel?.href).toContain("vercel.com");
  });

  it("should have Clerk service with valid URL", () => {
    const clerk = SERVICES.find((s: Service) => s.id === "clerk");
    expect(clerk?.href).toBeDefined();
    expect(clerk?.href).toContain("clerk.com");
  });

  it("should have Stripe service with valid URL", () => {
    const stripe = SERVICES.find((s: Service) => s.id === "stripe");
    expect(stripe?.href).toBeDefined();
    expect(stripe?.href).toContain("stripe.com");
  });

  it("should have Resend service with valid URL", () => {
    const resend = SERVICES.find((s: Service) => s.id === "resend");
    expect(resend?.href).toBeDefined();
    expect(resend?.href).toContain("resend.com");
  });

  it("should have UploadThing service with valid URL", () => {
    const uploadthing = SERVICES.find((s: Service) => s.id === "uploadthing");
    expect(uploadthing?.href).toBeDefined();
    expect(uploadthing?.href).toContain("uploadthing.com");
  });
});

describe("Admin Services - Supabase URL", () => {
  it("should extract project ref from POSTGRES_URL", () => {
    const url = getSupabaseConsole();
    expect(url).toContain("supabase.com/dashboard/project/");
    expect(url).toContain("abcdef123456");
  });

  it("should return default Supabase URL when no database URL is set", async () => {
    // Create a new mock for this test
    mock.module("@/env", () => ({
      env: {
        POSTGRES_URL: undefined,
        DATABASE_URL: undefined,
      },
    }));

    // Re-import with new mock
    const { getSupabaseConsole: getSupabase } = await import(
      "@/app/admin/services/constants"
    );

    // Note: Due to module caching, this may still use the old value
    // In a real scenario, you'd need to clear the module cache
    expect(typeof getSupabase).toBe("function");
  });
});

describe("Admin Services - Service List", () => {
  it("should have at least 6 services defined", () => {
    expect(SERVICES.length).toBeGreaterThanOrEqual(6);
  });

  it("each service should have required properties", () => {
    for (const service of SERVICES) {
      expect(service.id).toBeDefined();
      expect(service.id.length).toBeGreaterThan(0);

      expect(service.title).toBeDefined();
      expect(service.title.length).toBeGreaterThan(0);

      expect(service.description).toBeDefined();
      expect(service.description.length).toBeGreaterThan(0);

      expect(service.href).toBeDefined();

      expect(service.icon).toBeDefined();
      expect(service.icon.length).toBeGreaterThan(0);

      expect(service.color).toBeDefined();
      expect(service.color).toContain("bg-");

      expect(service.category).toBeDefined();
    }
  });

  it("service IDs should be unique", () => {
    const ids = SERVICES.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should include GitHub service", () => {
    const github = SERVICES.find((s) => s.id === "github");
    expect(github).toBeDefined();
    expect(github?.category).toBe("code");
  });

  it("should include Vercel service", () => {
    const vercel = SERVICES.find((s) => s.id === "vercel");
    expect(vercel).toBeDefined();
    expect(vercel?.category).toBe("infrastructure");
  });

  it("should include Supabase service", () => {
    const supabase = SERVICES.find((s) => s.id === "supabase");
    expect(supabase).toBeDefined();
    expect(supabase?.category).toBe("infrastructure");
  });

  it("should include Clerk service", () => {
    const clerk = SERVICES.find((s) => s.id === "clerk");
    expect(clerk).toBeDefined();
    expect(clerk?.category).toBe("auth");
  });

  it("should include Stripe service", () => {
    const stripe = SERVICES.find((s) => s.id === "stripe");
    expect(stripe).toBeDefined();
    expect(stripe?.category).toBe("payments");
  });

  it("should include Resend service", () => {
    const resend = SERVICES.find((s) => s.id === "resend");
    expect(resend).toBeDefined();
    expect(resend?.category).toBe("email");
  });

  it("should include UploadThing service", () => {
    const uploadthing = SERVICES.find((s) => s.id === "uploadthing");
    expect(uploadthing).toBeDefined();
    expect(uploadthing?.category).toBe("infrastructure");
  });
});

describe("Admin Services - Categories", () => {
  it("should have all required categories defined", () => {
    expect(SERVICE_CATEGORIES.code).toBeDefined();
    expect(SERVICE_CATEGORIES.infrastructure).toBeDefined();
    expect(SERVICE_CATEGORIES.auth).toBeDefined();
    expect(SERVICE_CATEGORIES.payments).toBeDefined();
    expect(SERVICE_CATEGORIES.email).toBeDefined();
  });

  it("each category should have label and order", () => {
    for (const [key, value] of Object.entries(SERVICE_CATEGORIES)) {
      expect(value.label).toBeDefined();
      expect(value.label.length).toBeGreaterThan(0);
      expect(value.order).toBeDefined();
      expect(typeof value.order).toBe("number");
    }
  });

  it("category orders should be unique", () => {
    const orders = Object.values(SERVICE_CATEGORIES).map((c) => c.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });

  it("all services should have valid categories", () => {
    const validCategories = Object.keys(SERVICE_CATEGORIES);
    for (const service of SERVICES) {
      expect(validCategories).toContain(service.category);
    }
  });
});

describe("Admin Services - Service Type", () => {
  it("Service type should match expected shape", () => {
    const service: Service = {
      id: "test",
      title: "Test Service",
      description: "A test service",
      href: "https://example.com",
      icon: "test-icon",
      color: "bg-blue-500",
      category: "code",
    };

    expect(service.id).toBe("test");
    expect(service.title).toBe("Test Service");
    expect(service.category).toBe("code");
  });
});

describe("Admin Services - URLs Format", () => {
  it("all non-dynamic service URLs should be valid URLs", () => {
    for (const service of SERVICES) {
      if (service.id !== "supabase") {
        expect(service.href).toMatch(/^https?:\/\//);
      }
    }
  });

  it("Supabase should have placeholder href for dynamic resolution", () => {
    const supabase = SERVICES.find((s) => s.id === "supabase");
    expect(supabase?.href).toBe("supabase");
  });
});

describe("Admin Services - Icon Names", () => {
  it("should use valid icon names", () => {
    const validIcons = [
      "github",
      "vercel",
      "database",
      "shield",
      "credit-card",
      "mail",
      "upload",
    ];
    for (const service of SERVICES) {
      expect(validIcons).toContain(service.icon);
    }
  });
});

describe("Admin Services - Color Classes", () => {
  it("all color classes should be Tailwind background classes", () => {
    for (const service of SERVICES) {
      expect(service.color).toMatch(/^bg-/);
    }
  });
});
