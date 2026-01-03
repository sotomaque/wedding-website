import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import { cookies } from "next/headers";
import { NAVIGATION_CONFIG } from "@/app/navigation-config";
import { SITE_CONFIG } from "@/app/site-config";
import { getGuestParty } from "@/lib/auth/guest-session";
import { getActivities, getVenues } from "./actions";
import { ThingsToDoContent } from "./things-to-do-content";

interface ThingsToDoPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ThingsToDoPage({
  searchParams,
}: ThingsToDoPageProps) {
  const params = await searchParams;

  // Get invite code from URL, cookie, or logged-in Clerk user
  const cookieStore = await cookies();
  const codeFromUrl = params.code?.toUpperCase();
  const codeFromCookie = cookieStore.get("invite_code")?.value?.toUpperCase();

  // Try to get invite code from Clerk user if logged in (this also validates URL/cookie codes)
  const party = await getGuestParty(codeFromUrl || codeFromCookie);
  const inviteCode = party?.inviteCode || codeFromUrl || codeFromCookie;

  // Fetch data from database
  const [activities, venues] = await Promise.all([
    getActivities(inviteCode),
    getVenues(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
      />

      <main className="grow">
        <ThingsToDoContent
          activities={activities}
          venues={venues}
          inviteCode={inviteCode}
        />
      </main>

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
