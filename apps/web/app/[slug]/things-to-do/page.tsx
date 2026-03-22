import { Footer } from "@workspace/ui/components/footer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MainNavigation } from "@/components/main-navigation";
import { getGuestParty } from "@/lib/auth/guest-session";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getActivities, getBeaches, getVenues } from "./actions";
import { ThingsToDoContent } from "./things-to-do-content";

interface ThingsToDoPageProps {
  searchParams: Promise<{ code?: string }>;
}

// Helper to get random San Diego image with correct extension
function getRandomSdImage(): string {
  const images: readonly string[] = [
    "/sd/1.jpg",
    "/sd/2.jpg",
    "/sd/3.webp",
    "/sd/4.jpg",
    "/sd/5.webp",
    "/sd/6.webp",
    "/sd/7.jpeg",
  ];
  const randomIndex = Math.floor(Math.random() * images.length);
  // biome-ignore lint/style/noNonNullAssertion: Array is guaranteed to have elements
  return images[randomIndex]!;
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

  // Select random hero image on server
  const heroImage = getRandomSdImage();

  // Fetch data from database
  const [activities, venues, beaches, settings] = await Promise.all([
    getActivities(inviteCode),
    getVenues(),
    getBeaches(inviteCode),
    getWeddingSettings(),
  ]);

  if (!settings.featureToggles.thingsToDo) notFound();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation />

      <main className="grow">
        <ThingsToDoContent
          activities={activities}
          venues={venues}
          beaches={beaches}
          inviteCode={inviteCode}
          heroImage={heroImage}
          weddingDate={settings.weddingDate}
        />
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}
