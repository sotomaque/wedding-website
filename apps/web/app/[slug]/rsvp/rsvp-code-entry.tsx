"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";
import { MainNavigation } from "@/components/main-navigation";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import { CodeEntry } from "./code-entry";

interface RSVPCodeEntryProps {
  invalidCode?: string;
  rsvpTitle: string;
  weddingDateFormatted: string;
  rsvpDeadlineText?: string;
  contactEmail?: string;
}

export function RSVPCodeEntry({
  invalidCode,
  rsvpTitle,
  weddingDateFormatted,
  rsvpDeadlineText,
  contactEmail,
}: RSVPCodeEntryProps) {
  const router = useRouter();
  const slug = useWeddingSlug();
  const t = useTranslations("rsvpPage");

  // Show error toast if an invalid code was provided
  useEffect(() => {
    if (invalidCode) {
      toast.error(t("invalidCode"), {
        description: t("invalidCodeUrl"),
      });
    }
  }, [invalidCode, t]);

  function handleCodeSuccess(code: string) {
    // Navigate to the same page with the code as a query param
    // The server will verify and show the form
    router.push(`/${slug}/rsvp?code=${encodeURIComponent(code)}`);
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
      <MainNavigation />

      {/* Content */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-serif text-center mb-4 text-white drop-shadow-lg">
            {rsvpTitle}
          </h1>
          <p className="text-xl md:text-2xl text-center text-white/90 mb-2 drop-shadow-md">
            {weddingDateFormatted}
          </p>
          <div className="w-24 h-1 bg-white/80 mx-auto mb-4" />
          <p className="text-white/80 text-center mb-4 drop-shadow-md">
            {rsvpDeadlineText}
          </p>
          <p className="text-center mb-12">
            <Link
              href={`/${slug}#details`}
              className="text-white hover:text-white/80 underline font-medium drop-shadow-md"
            >
              {t("viewWeddingDetails")}
            </Link>
          </p>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Image - Left Side */}
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden order-2 md:order-1">
              <Image src="/rsvp.png" alt="RSVP" fill className="object-cover" />
            </div>

            {/* Form - Right Side */}
            <div className="bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border order-1 md:order-2">
              <CodeEntry onSuccess={handleCodeSuccess} />

              {contactEmail && (
                <p className="text-sm text-muted-foreground mt-6 text-center">
                  {t("noInviteCode")}{" "}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-accent hover:underline font-medium"
                  >
                    {t("contactUs")}
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
