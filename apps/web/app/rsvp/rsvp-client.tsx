"use client";

import { Navigation } from "@workspace/ui/components/navigation";
import { useToast } from "@workspace/ui/hooks/use-toast";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/supabase/types";
import { NAVIGATION_CONFIG } from "../navigation-config";
import { verifyInviteCode } from "./actions";
import { CodeEntry } from "./code-entry";
import { RSVPForm } from "./rsvp-form";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface RSVPClientProps {
  initialCode?: string;
}

const PHOTO_PATHS = [
  "/our-photos/hawaii.jpeg",
  "/our-photos/kenmore.jpeg",
  "/our-photos/la-jolla.jpeg",
  "/our-photos/pacific-beach.jpeg",
  "/our-photos/carlsbad.jpeg",
  "/our-photos/knotts-berry.jpeg",
  "/our-photos/phoenix.jpeg",
  "/our-photos/basilica.jpeg",
  "/our-photos/padres.jpeg",
  "/our-photos/sphere.jpeg",
  "/our-photos/vegas.jpeg",
  "/our-photos/getty.jpeg",
  "/our-photos/seattle.jpeg",
  "/our-photos/cdmx.jpeg",
  "/our-photos/nicaragua.jpeg",
  "/our-photos/uw.jpeg",
  "/our-photos/steamboat-springs.jpeg",
  "/our-photos/keller.jpeg",
  "/our-photos/juanita-beach.jpeg",
  "/our-photos/bellevue.jpeg",
  "/our-photos/mount-rainer.jpeg",
  "/our-photos/haleiwa.jpeg",
  "/our-photos/makua.jpeg",
];

export function RSVPClient({ initialCode }: RSVPClientProps) {
  const [step, setStep] = useState<"code" | "form">("code");
  const [inviteCode, setInviteCode] = useState<string>(initialCode || "");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Select a random photo on mount
    const randomPhoto =
      PHOTO_PATHS[Math.floor(Math.random() * PHOTO_PATHS.length)];
    if (randomPhoto) {
      setBackgroundImage(randomPhoto);
    }
  }, []);

  // Auto-verify code if provided in URL
  useEffect(() => {
    async function autoVerifyCode() {
      if (initialCode && initialCode.length >= 8 && guests.length === 0) {
        setIsVerifyingCode(true);
        try {
          const result = await verifyInviteCode(initialCode);
          if (result.success && result.guests) {
            setGuests(result.guests);
            setStep("form");
          } else {
            // Invalid code - show code entry form
            setStep("code");
            toast({
              variant: "destructive",
              title: "Invalid Code",
              description:
                result.error || "The invite code in the URL is not valid.",
            });
          }
        } catch (error) {
          console.error("Error auto-verifying code:", error);
          setStep("code");
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to verify invite code",
          });
        } finally {
          setIsVerifyingCode(false);
        }
      }
    }
    autoVerifyCode();
  }, [initialCode, guests.length, toast]);

  function handleCodeSuccess(code: string, guestList: Guest[]) {
    setInviteCode(code);
    setGuests(guestList);
    setStep("form");
  }

  function handleBack() {
    setStep("code");
    setGuests([]);
    setInviteCode("");
  }

  return (
    <div className="min-h-screen h-screen overflow-y-auto relative">
      {/* Background Image with Blur */}
      {backgroundImage && (
        <div
          className="fixed inset-0 bg-cover bg-center -z-10"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: "blur(8px) brightness(0.7)",
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 -z-10" />

      {/* Navigation */}
      <div className="relative z-10">
        <Navigation
          brandImage={NAVIGATION_CONFIG.brandImage}
          leftLinks={NAVIGATION_CONFIG.leftLinks}
          rightLinks={NAVIGATION_CONFIG.rightLinks}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-white/20">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif text-foreground mb-2">
                Wedding RSVP
              </h1>
              <p className="text-muted-foreground">Helen & Enrique</p>
            </div>

            {/* Things to Do Link - Show after valid code */}
            {step === "form" && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm text-center text-purple-900 dark:text-purple-100">
                  Planning your trip to San Diego?{" "}
                  <Link
                    href="/things-to-do"
                    className="font-semibold underline hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    Check out Things to Do in San Diego
                  </Link>
                </p>
              </div>
            )}

            {/* Loading State */}
            {isVerifyingCode && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Verifying your invite code...
                </p>
              </div>
            )}

            {/* Step 1: Enter Invite Code */}
            {step === "code" && !isVerifyingCode && (
              <CodeEntry
                initialCode={initialCode}
                onSuccess={handleCodeSuccess}
              />
            )}

            {/* Step 2: RSVP Form */}
            {step === "form" && guests.length > 0 && !isVerifyingCode && (
              <RSVPForm
                guests={guests}
                inviteCode={inviteCode}
                onBack={handleBack}
              />
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-white/90 text-sm mt-6 drop-shadow-lg">
            Having trouble? Contact us at{" "}
            <a
              href="mailto:sotomaque@gmail.com"
              className="underline font-semibold"
            >
              sotomaque@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
