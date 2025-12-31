"use client";

import { Navigation } from "@workspace/ui/components/navigation";
import { useToast } from "@workspace/ui/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/supabase/types";
import { DETAILS_CONTENT, RSVP_CONTENT } from "../constants";
import { NAVIGATION_CONFIG } from "../navigation-config";
import { verifyInviteCode } from "./actions";
import { CodeEntry } from "./code-entry";
import { RSVPForm } from "./rsvp-form";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface RSVPClientProps {
  initialCode?: string;
}

export function RSVPClient({ initialCode }: RSVPClientProps) {
  const [step, setStep] = useState<"code" | "form">("code");
  const [inviteCode, setInviteCode] = useState<string>(initialCode || "");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const { toast } = useToast();

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
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image
          src="/table.png"
          alt=""
          fill
          className="object-cover blur-sm brightness-[0.85] scale-105"
          priority
        />
        {/* Overlay for better readability */}
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-serif text-center mb-4 text-white drop-shadow-lg">
            {RSVP_CONTENT.title}
          </h1>
          <p className="text-xl md:text-2xl text-center text-white/90 mb-2 drop-shadow-md">
            {DETAILS_CONTENT.date}
          </p>
          <div className="w-24 h-1 bg-white/80 mx-auto mb-4" />
          <p className="text-white/80 text-center mb-4 drop-shadow-md">
            {RSVP_CONTENT.deadline}
          </p>
          <p className="text-center mb-12">
            <Link
              href="/#details"
              className="text-white hover:text-white/80 underline font-medium drop-shadow-md"
            >
              View Wedding Details
            </Link>
          </p>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Image - Left Side */}
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden order-2 md:order-1">
              <Image
                src={RSVP_CONTENT.image.src}
                alt={RSVP_CONTENT.image.alt}
                fill
                className="object-cover"
              />
            </div>

            {/* Form - Right Side */}
            <div className="bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border order-1 md:order-2">
              {/* Things to Do Link - Show after valid code */}
              {step === "form" && (
                <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                  <p className="text-sm text-center text-foreground">
                    Planning your trip to San Diego?{" "}
                    <Link
                      href="/things-to-do"
                      className="font-semibold underline hover:text-accent transition-colors"
                    >
                      Check out Things to Do
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

              {/* Footer - only show on code entry */}
              {step === "code" && !isVerifyingCode && (
                <p className="text-sm text-muted-foreground mt-6 text-center">
                  Don't have an invite code?{" "}
                  <a
                    href="mailto:sotomaque@gmail.com"
                    className="text-accent hover:underline font-medium"
                  >
                    Contact us
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
