import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Clock, Code, Heart, Mail, Users } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";

function getCountdown(targetDate: Date) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isPast: false };
}

async function getGuestStats(weddingId: string) {
  // Get count of accepted A-list guests (not plus-ones)
  const acceptedAListCount = await db.guest.count({
    where: {
      list: "a",
      rsvpStatus: "yes",
      isPlusOne: false,
      weddingId,
    },
  });

  // Get total A-list guests (not plus-ones)
  const totalAListCount = await db.guest.count({
    where: {
      list: "a",
      isPlusOne: false,
      weddingId,
    },
  });

  // Get total accepted guests (including plus-ones)
  const totalAcceptedCount = await db.guest.count({
    where: {
      rsvpStatus: "yes",
      weddingId,
    },
  });

  return {
    acceptedAList: acceptedAListCount,
    totalAList: totalAListCount,
    totalAccepted: totalAcceptedCount,
  };
}

export default async function AdminPage() {
  const [user, settings] = await Promise.all([
    currentUser(),
    getWeddingSettings(),
  ]);

  const weddingCountdown = getCountdown(settings.weddingDate);
  const rsvpDeadline = settings.rsvpDeadline
    ? new Date(settings.rsvpDeadline)
    : settings.weddingDate;
  const rsvpCountdown = getCountdown(rsvpDeadline);
  const rsvpDeadlineFormatted = rsvpDeadline.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weddingDateFormatted = settings.weddingDate.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );
  const stats = await getGuestStats(settings.id);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-serif text-foreground mb-2">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.firstName || "Admin"}!
              </p>
            </div>
            <SignOutButton>
              <Button variant="outline">Sign Out</Button>
            </SignOutButton>
          </div>

          <div className="space-y-6">
            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Accepted A-List Guests */}
              <div className="p-6 bg-secondary rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    A-List RSVPs
                  </h3>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {stats.totalAccepted}
                </p>
                <p className="text-sm text-muted-foreground mt-1">accepted</p>
              </div>

              {/* RSVP Deadline Countdown */}
              <div className="p-6 bg-secondary rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-6 h-6 text-orange-500" />
                  <h3 className="font-semibold text-foreground">
                    RSVP Deadline
                  </h3>
                </div>
                {rsvpCountdown.isPast ? (
                  <p className="text-xl font-bold text-muted-foreground">
                    Deadline passed
                  </p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-foreground">
                      {rsvpCountdown.days}
                      <span className="text-lg font-normal text-muted-foreground">
                        {" "}
                        days
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rsvpDeadlineFormatted}
                    </p>
                  </>
                )}
              </div>

              {/* Wedding Date Countdown */}
              <div className="p-6 bg-secondary rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Heart className="w-6 h-6 text-pink-500" />
                  <h3 className="font-semibold text-foreground">Wedding Day</h3>
                </div>
                {weddingCountdown.isPast ? (
                  <p className="text-xl font-bold text-muted-foreground">
                    Married!
                  </p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-foreground">
                      {weddingCountdown.days}
                      <span className="text-lg font-normal text-muted-foreground">
                        {" "}
                        days
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {weddingDateFormatted}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/guests">
                  <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                    <Users className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">
                      Guest Management
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Manage guest list and send invitations
                    </p>
                  </div>
                </Link>

                <Link href="/admin/events">
                  <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                    <Calendar className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">
                      Events
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Manage wedding events and invitations
                    </p>
                  </div>
                </Link>

                <Link href="/admin/templates">
                  <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                    <Mail className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">
                      Email Templates
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Create and manage email templates
                    </p>
                  </div>
                </Link>

                <Link href="/admin/api-docs">
                  <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                    <Code className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">
                      API Docs
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Interactive API reference and testing
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
