import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Helen & Enrique | Wedding",
  description:
    "Join us in celebrating our wedding in San Diego! Find all the details about our ceremony, reception, and things to do in beautiful San Diego.",
  keywords: ["wedding", "San Diego wedding", "Helen and Enrique"],
  authors: [{ name: "Helen & Enrique" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Helen & Enrique | Wedding",
    description:
      "Join us in celebrating our wedding in San Diego! Find all the details about our ceremony, reception, and things to do in beautiful San Diego.",
    type: "website",
    locale: "en_US",
    siteName: "Helen & Enrique's Wedding",
    images: [
      {
        url: "/favicon.ico",
        width: 512,
        height: 512,
        alt: "Helen & Enrique Wedding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Helen & Enrique | Wedding",
    description:
      "Join us in celebrating our wedding in San Diego! Find all the details about our ceremony, reception, and things to do in beautiful San Diego.",
    images: ["/favicon.ico"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
