"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import { Navigation } from "@workspace/ui/components/navigation";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { NAVIGATION_CONFIG } from "../navigation-config";
import { linkClerkUserToGuestAction } from "./actions";

interface OptionalLoginStepProps {
  inviteCode: string;
}

export function OptionalLoginStep({ inviteCode }: OptionalLoginStepProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isPending, startTransition] = useTransition();
  const [isLinking, setIsLinking] = useState(false);

  // If user is already signed in, auto-link and proceed
  useEffect(() => {
    if (isLoaded && user && !isLinking) {
      setIsLinking(true);
      startTransition(async () => {
        await linkClerkUserToGuestAction(inviteCode);
        // Proceed to form with linked flag
        router.push(`/rsvp?code=${encodeURIComponent(inviteCode)}&step=form`);
      });
    }
  }, [isLoaded, user, inviteCode, router, isLinking]);

  function handleSkip() {
    // Proceed without linking
    router.push(`/rsvp?code=${encodeURIComponent(inviteCode)}&step=form`);
  }

  // Show loading while checking auth or linking
  if (!isLoaded || (user && isPending)) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <Image
            src="/table-6.png"
            alt=""
            fill
            className="object-cover blur-sm brightness-[0.85] scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <Navigation
          brandImage={NAVIGATION_CONFIG.brandImage}
          leftLinks={NAVIGATION_CONFIG.leftLinks}
          rightLinks={NAVIGATION_CONFIG.rightLinks}
        />
        <section className="py-24 px-6">
          <div className="max-w-md mx-auto bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image
          src="/table-6.png"
          alt=""
          fill
          className="object-cover blur-sm brightness-[0.85] scale-105"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Navigation */}
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
      />

      {/* Content */}
      <section className="py-24 px-6">
        <div className="max-w-md mx-auto">
          <div className="bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border">
            <h2 className="text-2xl font-serif text-center mb-4">
              Sign In (Optional)
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Sign in to save your preferences and easily access your RSVP
              later. You can also skip this step.
            </p>

            <div className="space-y-4">
              <SignInButton
                mode="modal"
                fallbackRedirectUrl={`/rsvp?code=${encodeURIComponent(inviteCode)}&step=form`}
                signUpFallbackRedirectUrl={`/rsvp?code=${encodeURIComponent(inviteCode)}&step=form`}
              >
                <Button className="w-full" size="lg">
                  Sign In with Google
                </Button>
              </SignInButton>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Your invite code will be remembered for this session
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
