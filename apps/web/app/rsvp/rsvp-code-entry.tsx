"use client";

import { Navigation } from "@workspace/ui/components/navigation";
import { useToast } from "@workspace/ui/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DETAILS_CONTENT, RSVP_CONTENT } from "../constants";
import { NAVIGATION_CONFIG } from "../navigation-config";
import { CodeEntry } from "./code-entry";

interface RSVPCodeEntryProps {
  invalidCode?: string;
}

export function RSVPCodeEntry({ invalidCode }: RSVPCodeEntryProps) {
  const { toast } = useToast();
  const router = useRouter();

  // Show error toast if an invalid code was provided
  useEffect(() => {
    if (invalidCode) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "The invite code in the URL is not valid.",
      });
    }
  }, [invalidCode, toast]);

  function handleCodeSuccess(code: string) {
    // Navigate to the same page with the code as a query param
    // The server will verify and show the form
    router.push(`/rsvp?code=${encodeURIComponent(code)}`);
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
              <CodeEntry onSuccess={handleCodeSuccess} />

              <p className="text-sm text-muted-foreground mt-6 text-center">
                Don't have an invite code?{" "}
                <a
                  href="mailto:sotomaque@gmail.com"
                  className="text-accent hover:underline font-medium"
                >
                  Contact us
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
