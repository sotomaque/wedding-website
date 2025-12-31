import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Mail, Users } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const user = await currentUser();

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
            <div className="p-6 bg-secondary rounded-lg">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Account Information
              </h2>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd className="text-foreground font-medium">
                    {user?.firstName} {user?.lastName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Email:</dt>
                  <dd className="text-foreground font-medium">
                    {user?.emailAddresses[0]?.emailAddress}
                  </dd>
                </div>
              </dl>
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

                <div className="p-6 bg-card border border-border rounded-lg opacity-50 cursor-not-allowed">
                  <Calendar className="w-8 h-8 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">
                    Event Schedule
                  </h3>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>

                <div className="p-6 bg-card border border-border rounded-lg opacity-50 cursor-not-allowed">
                  <Mail className="w-8 h-8 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">
                    Email Templates
                  </h3>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
