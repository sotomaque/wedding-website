import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            {/** biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon */}
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-serif text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the admin dashboard. This area
            is restricted to authorized administrators only.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button className="w-full">Return to Home</Button>
            </Link>
            <SignOutButton>
              <Button variant="outline" className="w-full">
                Sign Out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
