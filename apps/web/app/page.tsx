import { auth } from "@clerk/nextjs/server";
import {
  Calendar,
  Camera,
  CheckCircle,
  Gift,
  Heart,
  Mail,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

const FEATURES = [
  {
    icon: Users,
    title: "Guest Management",
    description:
      "Track RSVPs, manage A/B/C list tiers, organize parties, and handle plus-ones — all in one dashboard.",
  },
  {
    icon: Mail,
    title: "Email Invitations",
    description:
      "Send personalized invitations with unique RSVP codes. Track delivery, resend with one click, or bulk-send to segments.",
  },
  {
    icon: Calendar,
    title: "Event Coordination",
    description:
      "Manage ceremony, reception, and rehearsal events. Send per-event invites and share .ics calendar files.",
  },
  {
    icon: Camera,
    title: "Live Photo Sharing",
    description:
      "Guests upload photos via QR code during the event. Moderate in real time and display a live slideshow.",
  },
  {
    icon: MapPin,
    title: "Travel & Logistics",
    description:
      "Share hotel blocks, local activities, and vendor recommendations. Guests plan their trip with a built-in calendar.",
  },
  {
    icon: Gift,
    title: "Gift Registry",
    description:
      "Create custom gift funds with Stripe. Track donations, match to guests, and send thank-you emails.",
  },
];

export default async function LandingPage() {
  // Signed-in visitors don't need the marketing page — send them to their
  // dashboard, which lists their weddings and leads into the admin (where the
  // "Main Site" nav link reaches the public site).
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white/80" />
          <span className="font-serif text-lg text-white">The Ceremony</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero — full bleed image */}
      <section className="relative h-[90vh] min-h-[600px] overflow-hidden">
        <Image
          src="/landing/wedding-ceremony-1.jpg"
          alt="Wedding celebration"
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/70 mb-4">
            The wedding platform for modern couples
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-6 leading-[1.05] max-w-4xl">
            Your Wedding,
            <br />
            Your Way
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-10 leading-relaxed">
            Create a stunning wedding website in minutes. Manage guests, send
            invitations, coordinate events, and share your love story.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black shadow-lg hover:bg-white/90 transition-colors"
            >
              Create Your Free Site
            </Link>
            <Link
              href="/helen-and-enrique"
              className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              View Live Example
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 rounded-full bg-white/60 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/50 bg-card">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 flex flex-wrap items-center justify-center gap-8 md:gap-20 text-center">
          {[
            { value: "500+", label: "Guests managed" },
            { value: "50+", label: "Events coordinated" },
            { value: "1,000+", label: "RSVPs tracked" },
            { value: "200+", label: "Photos shared" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-serif text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-5xl font-serif mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              From the first save-the-date to the last dance — tools built for
              every step of your wedding.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo mosaic strip */}
      <section className="bg-card border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/landing/invitation.jpg"
                alt="Wedding invitation"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-lg md:mt-8">
              <Image
                src="/landing/wedding-ceremony-2.jpg"
                alt="Couple holding hands"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/landing/save-the-date.jpg"
                alt="Save the date stationery"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-lg md:mt-8">
              <Image
                src="/landing/rsvp.jpg"
                alt="RSVP card"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-5xl font-serif mb-4">
              Ready in Minutes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              No design skills needed. Answer a few questions and your wedding
              site is live.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: "01",
                title: "Sign Up & Choose Your URL",
                description:
                  "Create an account, enter your names and wedding date, and pick a custom URL for your site.",
              },
              {
                step: "02",
                title: "Customize Your Site",
                description:
                  "Add your love story, venue details, event schedule, and registry. Toggle features on or off as you need.",
              },
              {
                step: "03",
                title: "Invite & Manage",
                description:
                  "Import your guest list, send personalized invitations, track RSVPs in real time, and build seating charts.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-7xl font-serif text-accent/10 absolute -top-6 -left-2 select-none">
                  {item.step}
                </span>
                <div className="pt-12">
                  <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlight with sparkler image */}
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2">
          {/* Image half */}
          <div className="relative h-[400px] lg:h-auto">
            <Image
              src="/landing/wedding-ceremony-3.jpg"
              alt="Sparkler exit celebration"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 lg:bg-none" />
          </div>

          {/* Content half */}
          <div className="bg-card px-8 md:px-16 py-16 md:py-24 flex items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
                Built for Real Weddings
              </p>
              <h2 className="text-3xl md:text-4xl font-serif mb-8">
                Every Detail, Handled
              </h2>
              <ul className="space-y-4">
                {[
                  "Beautiful, responsive website with your custom URL",
                  "Powerful admin dashboard with real-time RSVP tracking",
                  "Email invitations with personalized invite codes",
                  "Guest photo uploads with QR code and live slideshow",
                  "Seating chart builder with drag-and-drop",
                  "Per-event invitations and calendar file downloads",
                  "Hotel blocks, activities, and vendor recommendations",
                  "Feature toggles — show only what you need",
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-24 md:py-32 relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <Heart className="h-10 w-10 text-accent mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-serif mb-4">
            Start Planning Your Perfect Day
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Join couples who are using our platform to create unforgettable
            wedding experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Create Your Free Wedding Site
            </Link>
            <Link
              href="/helen-and-enrique"
              className="inline-flex items-center justify-center rounded-full border border-input bg-background px-8 py-3.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              See It in Action
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Free to start. No credit card required.
          </p>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-serif text-sm">The Ceremony</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} The Ceremony. Made with love.
          </p>
        </div>
      </footer>
    </div>
  );
}
