import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Plan Your Perfect Wedding
        </h1>
        <p className="text-lg text-muted-foreground">
          Create a beautiful wedding website, manage your guest list, handle
          RSVPs, and coordinate every detail — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Sign In
          </Link>
        </div>
        <Link
          href="/helen-and-enrique"
          className="text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          View example site →
        </Link>
      </div>
    </div>
  );
}
