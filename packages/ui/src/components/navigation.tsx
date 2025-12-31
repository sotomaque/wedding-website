import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export interface NavLink {
  href: string
  label: string
}

export interface NavigationProps {
  brandText: string
  leftLinks?: NavLink[]
  rightLinks?: NavLink[]
  className?: string
}

function Navigation({
  brandText,
  leftLinks = [],
  rightLinks = [],
  className,
}: NavigationProps) {
  return (
    <header className={cn("sticky top-0 w-full z-50 bg-neutral-50 py-4 lg:py-8", className)}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
        <nav className="grid grid-cols-2 lg:grid-cols-3 items-center text-neutral-900">
          {/* Left Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 mr-auto">
            {leftLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm uppercase transition-colors hover:text-neutral-600"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Brand/Logo */}
          <a href="/" className="lg:text-center lg:justify-center">
            <span className="sr-only">Go home</span>
            <span className="text-2xl lg:text-6xl font-medium tracking-tight font-serif uppercase focus:outline-none text-neutral-900">
              {brandText}
            </span>
          </a>

          {/* Right Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 ml-auto">
            {rightLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm uppercase transition-colors hover:text-neutral-600"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile Menu */}
          <div className="lg:hidden ml-auto">
            <details className="group">
              <summary className="list-none text-2xl font-medium tracking-tight font-serif uppercase focus:outline-none text-neutral-900 cursor-pointer">
                Menu
              </summary>
              <div className="absolute top-full left-0 right-0 bg-neutral-50 mt-4 group-open:block hidden">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-4 flex flex-col gap-4">
                  {leftLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-3xl font-medium tracking-tight font-serif uppercase focus:outline-none text-neutral-900"
                    >
                      {link.label}
                    </a>
                  ))}
                  {rightLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-3xl font-medium tracking-tight font-serif uppercase focus:outline-none text-neutral-900"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </nav>
      </div>
    </header>
  )
}

export { Navigation }
