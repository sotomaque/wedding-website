"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

export type NavItem = NavLink | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "links" in item;
}

/**
 * Navigation layout style, driven by the wedding's selected layout template.
 * - centered: links split left/right around a centered brand (the default).
 * - left-aligned: brand on the left, all links grouped on the right.
 * - minimal: centered brand stacked above a single centered row of links.
 */
export type NavVariant = "centered" | "left-aligned" | "minimal";

export interface NavigationProps {
  brandText?: string;
  brandImage?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  /** Destination for the brand logo / text. Defaults to "/" for the platform
   * landing; wedding sites must pass `/${slug}` so the logo returns to the
   * wedding home instead of the platform marketing page. */
  brandHref?: string;
  leftLinks?: NavItem[];
  rightLinks?: NavItem[];
  variant?: NavVariant;
  className?: string;
}

function NavItemLink({
  link,
  pathname,
  className,
  onClick,
}: {
  link: NavLink;
  pathname: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const isActive = pathname === link.href;
  return (
    <a
      href={link.href}
      onClick={onClick}
      className={cn(className, isActive && "font-bold")}
    >
      {link.label}
    </a>
  );
}

function NavGroupDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const isGroupActive = group.links.some((l) => pathname.startsWith(l.href));

  return (
    <DropdownMenu>
      {/* Radix's internal useId for aria-controls occasionally mismatches between
          SSR and hydration here (the id is auto-allocated by tree position and
          our nav variants shift the count). The mismatch is on a non-visible
          aria attribute and Radix re-wires it client-side, so it's a noisy
          warning with no user-facing effect — silence it on this trigger only. */}
      <DropdownMenuTrigger
        suppressHydrationWarning
        className={cn(
          "flex items-center gap-1 text-sm uppercase transition-colors hover:text-accent focus:outline-none",
          isGroupActive && "font-bold",
        )}
      >
        {group.label}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[140px]">
        {group.links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <DropdownMenuItem key={link.href} asChild>
              <a
                href={link.href}
                className={cn("cursor-pointer", isActive && "font-bold")}
              >
                {link.label}
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function renderNavItem(item: NavItem, pathname: string) {
  if (isNavGroup(item)) {
    return (
      <NavGroupDropdown key={item.label} group={item} pathname={pathname} />
    );
  }
  return (
    <NavItemLink
      key={item.href}
      link={item}
      pathname={pathname}
      className="text-sm uppercase transition-colors hover:text-accent"
    />
  );
}

function Brand({
  brandText,
  brandImage,
  brandHref,
  className,
}: {
  brandText?: string;
  brandImage?: NavigationProps["brandImage"];
  brandHref?: string;
  className?: string;
}) {
  return (
    <a href={brandHref ?? "/"} className={className}>
      <span className="sr-only">Go home</span>
      {brandImage ? (
        <Image
          src={brandImage.src}
          alt={brandImage.alt}
          width={brandImage.width || 200}
          height={brandImage.height || 64}
          className="h-8 lg:h-16 w-auto object-contain"
          priority
        />
      ) : (
        <span className="text-2xl lg:text-6xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground">
          {brandText}
        </span>
      )}
    </a>
  );
}

function MobileMenu({
  links,
  pathname,
}: {
  links: NavLink[];
  pathname: string;
}) {
  return (
    <div className="lg:hidden ml-auto">
      <details className="group">
        <summary className="list-none text-2xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground cursor-pointer">
          Menu
        </summary>
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border md:mt-4 overflow-hidden transition-all duration-900 ease-in-out group-open:opacity-100 group-open:max-h-[600px] opacity-0 max-h-0">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-4 flex flex-col gap-4">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    const details = (e.target as HTMLElement).closest(
                      "details",
                    );
                    if (details) details.removeAttribute("open");
                  }}
                  className={cn(
                    "text-3xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground",
                    isActive && "font-bold",
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}

function Navigation({
  brandText,
  brandImage,
  brandHref,
  leftLinks = [],
  rightLinks = [],
  variant = "centered",
  className,
}: NavigationProps) {
  const pathname = usePathname();

  // Flatten groups for mobile menu
  const allLinksMobile = [...leftLinks, ...rightLinks].flatMap((item) =>
    isNavGroup(item) ? item.links : [item],
  );

  return (
    <header
      className={cn(
        "sticky top-0 w-full z-50 bg-background border-b border-border py-4 lg:py-8",
        className,
      )}
    >
      <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
        {variant === "centered" && (
          <nav className="grid grid-cols-2 lg:grid-cols-3 items-center text-foreground">
            <div className="hidden lg:flex items-center gap-6 mr-auto">
              {leftLinks.map((item) => renderNavItem(item, pathname))}
            </div>
            <Brand
              brandText={brandText}
              brandImage={brandImage}
              brandHref={brandHref}
              className="lg:text-center lg:justify-center flex justify-start lg:justify-center"
            />
            <div className="hidden lg:flex items-center gap-6 ml-auto">
              {rightLinks.map((item) => renderNavItem(item, pathname))}
            </div>
            <MobileMenu links={allLinksMobile} pathname={pathname} />
          </nav>
        )}

        {variant === "left-aligned" && (
          <nav className="grid grid-cols-2 items-center text-foreground">
            <Brand
              brandText={brandText}
              brandImage={brandImage}
              brandHref={brandHref}
              className="flex justify-start"
            />
            <div className="hidden lg:flex items-center gap-6 ml-auto">
              {[...leftLinks, ...rightLinks].map((item) =>
                renderNavItem(item, pathname),
              )}
            </div>
            <MobileMenu links={allLinksMobile} pathname={pathname} />
          </nav>
        )}

        {variant === "minimal" && (
          <nav className="text-foreground">
            <div className="grid grid-cols-2 lg:flex lg:flex-col lg:items-center lg:gap-4 items-center">
              <Brand
                brandText={brandText}
                brandImage={brandImage}
                brandHref={brandHref}
                className="flex justify-start lg:justify-center"
              />
              <div className="hidden lg:flex items-center justify-center gap-6 flex-wrap">
                {[...leftLinks, ...rightLinks].map((item) =>
                  renderNavItem(item, pathname),
                )}
              </div>
              <MobileMenu links={allLinksMobile} pathname={pathname} />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export { Navigation };
