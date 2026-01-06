import { env } from "@/env";

export interface Service {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  category: "infrastructure" | "auth" | "payments" | "email" | "code";
}

// Service URLs - some from env, some static
const GITHUB_REPO = "https://github.com/sotomaque/wedding-website";

const VERCEL_CONSOLE =
  "https://vercel.com/enriques-projects-b7c71f69/wedding-website-web";

const CLERK_CONSOLE =
  "https://dashboard.clerk.com/apps/app_37bbuCh5uljkrswAgBDeBAnXMsC/instances/ins_37bbu89pfXQebj59WQgbKEG8PAn";

const STRIPE_CONSOLE =
  "https://dashboard.stripe.com/acct_1SmMQ0DASTkBmt6O/dashboard";

const RESEND_CONSOLE = "https://resend.com/emails";

const UPLOADTHING_CONSOLE = "https://uploadthing.com/dashboard";

// Supabase URL comes from env since it's project-specific
export const getSupabaseConsole = () => {
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) return "https://supabase.com/dashboard";

  // Extract project ref from DATABASE_URL
  // Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...
  const match = dbUrl.match(/postgres\.([a-z0-9]+):/);
  if (match?.[1]) {
    return `https://supabase.com/dashboard/project/${match[1]}`;
  }
  return "https://supabase.com/dashboard";
};

export const SERVICES: Service[] = [
  {
    id: "github",
    title: "GitHub",
    description: "Source code repository and version control",
    href: GITHUB_REPO,
    icon: "github",
    color: "bg-gray-900 dark:bg-gray-100",
    category: "code",
  },
  {
    id: "vercel",
    title: "Vercel",
    description: "Hosting and deployment platform",
    href: VERCEL_CONSOLE,
    icon: "vercel",
    color: "bg-black dark:bg-white",
    category: "infrastructure",
  },
  {
    id: "supabase",
    title: "Supabase",
    description: "PostgreSQL database and backend services",
    href: "supabase", // Will be resolved dynamically
    icon: "database",
    color: "bg-emerald-600",
    category: "infrastructure",
  },
  {
    id: "clerk",
    title: "Clerk",
    description: "Authentication and user management",
    href: CLERK_CONSOLE,
    icon: "shield",
    color: "bg-violet-600",
    category: "auth",
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "Payment processing and gift registry",
    href: STRIPE_CONSOLE,
    icon: "credit-card",
    color: "bg-indigo-600",
    category: "payments",
  },
  {
    id: "resend",
    title: "Resend",
    description: "Transactional email delivery",
    href: RESEND_CONSOLE,
    icon: "mail",
    color: "bg-black dark:bg-white",
    category: "email",
  },
  {
    id: "uploadthing",
    title: "UploadThing",
    description: "File uploads and media storage",
    href: UPLOADTHING_CONSOLE,
    icon: "upload",
    color: "bg-red-600",
    category: "infrastructure",
  },
];

export const SERVICE_CATEGORIES = {
  code: { label: "Code & Version Control", order: 1 },
  infrastructure: { label: "Infrastructure", order: 2 },
  auth: { label: "Authentication", order: 3 },
  payments: { label: "Payments", order: 4 },
  email: { label: "Email", order: 5 },
} as const;
