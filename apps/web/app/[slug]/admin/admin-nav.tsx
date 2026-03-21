"use client";

import { SignOutButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

interface NavLink {
  type: "link";
  href: string;
  label: string;
  external?: boolean;
}

interface NavGroup {
  type: "group";
  label: string;
  links: Omit<NavLink, "type">[];
}

type NavItem = NavLink | NavGroup;

function getNavItems(slug: string): NavItem[] {
  const base = `/${slug}`;
  return [
    {
      type: "group",
      label: "Guests",
      links: [
        { href: `${base}/admin/guests`, label: "Management" },
        { href: `${base}/admin/parties`, label: "Parties" },
        { href: `${base}/admin/seating`, label: "Seating" },
      ],
    },
    {
      type: "group",
      label: "Photos",
      links: [
        { href: `${base}/admin/photos`, label: "Main Photos" },
        { href: `${base}/admin/photos/guest`, label: "Guest Photos" },
        { href: `${base}/slideshow`, label: "Slideshow ↗", external: true },
      ],
    },
    { type: "link", href: `${base}/admin/events`, label: "Events" },
    { type: "link", href: `${base}/admin/calendar`, label: "Calendar" },
    { type: "link", href: `${base}/admin/gifts`, label: "Gifts" },
    { type: "link", href: `${base}/admin/vendors`, label: "Vendors" },
    { type: "link", href: `${base}/admin/documents`, label: "Documents" },
    { type: "link", href: `${base}/admin/templates`, label: "Templates" },
    { type: "link", href: `${base}/admin/todos`, label: "Todos" },
    {
      type: "group",
      label: "Admin",
      links: [
        { href: `${base}/admin/services`, label: "Services" },
        { href: `${base}/admin/api-docs`, label: "API Docs" },
      ],
    },
  ];
}

function NavDropdown({
  group,
  pathname,
}: {
  group: Omit<NavGroup, "type">;
  pathname: string;
}) {
  const isActive = group.links.some((l) => !l.external && pathname === l.href);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "text-sm font-medium transition-colors hover:text-accent flex items-center gap-1 outline-none",
          isActive && "text-accent border-b-2 border-accent",
        )}
      >
        {group.label}
        <span className="text-xs opacity-60">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {group.label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {group.links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={cn(
                "cursor-pointer",
                !link.external && pathname === link.href && "font-medium",
              )}
            >
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const slug = useWeddingSlug();
  const navItems = useMemo(() => getNavItems(slug), [slug]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 w-full z-50 bg-background border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link
            href={`/${slug}/admin`}
            className="text-xl lg:text-2xl font-serif font-medium tracking-tight"
          >
            Admin
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) =>
              item.type === "group" ? (
                <NavDropdown
                  key={item.label}
                  group={item}
                  pathname={pathname}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-accent",
                    pathname === item.href &&
                      "text-accent border-b-2 border-accent",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}

            <Link
              href={`/${slug}`}
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
              {navItems.map((item) =>
                item.type === "group" ? (
                  <div key={item.label} className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      {item.label}
                    </p>
                    {item.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        {...(link.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className={cn(
                          "text-lg font-medium transition-colors hover:text-accent pl-3",
                          !link.external &&
                            pathname === link.href &&
                            "text-accent",
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-accent",
                      pathname === item.href && "text-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}

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
