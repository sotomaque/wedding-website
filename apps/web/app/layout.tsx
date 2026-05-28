import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Inter,
  Lora,
  Montserrat,
  Playfair_Display,
  Quicksand,
  Sacramento,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "@workspace/ui/globals.css";
import "@clerk/ui/themes/shadcn.css";
import { Providers } from "@/components/providers";
import { env } from "@/env";

// Default body font. Exposed as --font-geist so the @theme `--font-sans`
// token can fall back to it when no per-wedding font pairing is selected.
const fontGeist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Curated wedding font pairings (see lib/fonts.ts). All are statically loaded
// once here — next/font cannot load fonts per request — and selected
// per-wedding by remapping --font-heading / --font-body in [slug]/layout.tsx.
const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const fontLora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

const fontCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const fontMontserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

const fontSacramento = Sacramento({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-sacramento",
});

const fontEbGaramond = EB_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-eb-garamond",
});

const fontInter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fontQuicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quicksand",
});

const fontVariables = [
  fontGeist.variable,
  fontMono.variable,
  fontPlayfair.variable,
  fontLora.variable,
  fontCormorant.variable,
  fontMontserrat.variable,
  fontSacramento.variable,
  fontEbGaramond.variable,
  fontInter.variable,
  fontQuicksand.variable,
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "The Ceremony",
    template: "%s",
  },
  description:
    "Create a beautiful wedding website, manage your guest list, handle RSVPs, and coordinate every detail.",
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html lang={locale} suppressHydrationWarning>
        <body className={`${fontVariables} font-sans antialiased `}>
          <NextIntlClientProvider messages={messages}>
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
