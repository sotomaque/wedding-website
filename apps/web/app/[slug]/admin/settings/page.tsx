import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const weddingId = await getWeddingId();
  const wedding = await db.wedding.findUniqueOrThrow({
    where: { id: weddingId },
  });

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <SettingsClient wedding={wedding} />
      </div>
    </div>
  );
}
