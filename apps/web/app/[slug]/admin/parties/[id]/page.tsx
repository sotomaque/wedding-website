import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getParties, getPartyById } from "../actions";
import { PartyEditForm } from "./party-edit-form";
import { PartyGuestsList } from "./party-guests-list";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function PartyDetailPage({ params }: PageProps) {
  const { slug, id } = await params;
  const [party, allParties] = await Promise.all([
    getPartyById(id),
    getParties(),
  ]);

  if (!party) {
    notFound();
  }

  // Get other parties for the move guest dropdown (exclude current party)
  const otherParties = allParties.filter((p) => p.id !== party.id);

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-4 py-6 sm:px-6 md:px-8 md:py-8 border border-border">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/${slug}/admin/parties`}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-serif text-foreground">
                Edit Party
              </h1>
              <p className="text-sm text-muted-foreground">
                Invite Code:{" "}
                <span className="font-mono bg-secondary px-2 py-0.5 rounded">
                  {party.inviteCode}
                </span>
              </p>
            </div>
          </div>

          {/* Party Details Form */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Party Details</h2>
            <PartyEditForm party={party} />
          </div>

          {/* Party Members */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Party Members ({party.guestCount})
            </h2>
            <PartyGuestsList party={party} otherParties={otherParties} />
          </div>
        </div>
      </div>
    </div>
  );
}
