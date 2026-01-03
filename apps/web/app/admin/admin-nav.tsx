"use client";

import { SignOutButton } from "@clerk/nextjs";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface AdminNavLink {
  href: string;
  label: string;
}

const adminLinks: AdminNavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/photos", label: "Photos" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 w-full z-50 bg-background border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Brand/Logo */}
          <Link
            href="/admin"
            className="text-xl lg:text-2xl font-serif font-medium tracking-tight"
          >
            Admin
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {adminLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-accent",
                    isActive && "text-accent border-b-2 border-accent",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-accent"
            >
              Main Site
            </Link>
            <SignOutButton>
              <button
                type="button"
                className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                Logout
              </button>
            </SignOutButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden text-sm font-medium"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {adminLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-accent",
                      isActive && "text-accent",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-medium transition-colors hover:text-accent"
              >
                Main Site
              </Link>
              <SignOutButton>
                <button
                  type="button"
                  className="text-lg font-medium text-destructive hover:text-destructive/80 transition-colors text-left"
                >
                  Logout
                </button>
              </SignOutButton>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
