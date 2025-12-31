import { cn } from "@workspace/ui/lib/utils";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavigationProps {
  brandText?: string;
  brandImage?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  leftLinks?: NavLink[];
  rightLinks?: NavLink[];
  className?: string;
  activeSection?: string;
}

function Navigation({
  brandText,
  brandImage,
  leftLinks = [],
  rightLinks = [],
  className,
  activeSection = "",
}: NavigationProps) {
  return (
    <header
      className={cn(
        "sticky top-0 w-full z-50 bg-background border-b border-border py-4 lg:py-8",
        className,
      )}
    >
      <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
        <nav className="grid grid-cols-2 lg:grid-cols-3 items-center text-foreground">
          {/* Left Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 mr-auto">
            {leftLinks.map((link) => {
              const isActive = link.href === `#${activeSection}`;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm uppercase transition-colors hover:text-accent",
                    isActive && "font-bold text-accent",
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Brand/Logo */}
          <a href="/" className="lg:text-center lg:justify-center flex justify-start lg:justify-center">
            <span className="sr-only">Go home</span>
            {brandImage ? (
              <img
                src={brandImage.src}
                alt={brandImage.alt}
                width={brandImage.width}
                height={brandImage.height}
                className="h-8 lg:h-16 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl lg:text-6xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground">
                {brandText}
              </span>
            )}
          </a>

          {/* Right Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 ml-auto">
            {rightLinks.map((link) => {
              const isActive = link.href === `#${activeSection}`;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm uppercase transition-colors hover:text-accent",
                    isActive && "font-bold text-accent",
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Mobile Menu */}
          <div className="lg:hidden ml-auto">
            <details className="group">
              <summary className="list-none text-2xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground cursor-pointer">
                Menu
              </summary>
              <div className="absolute top-full left-0 right-0 bg-background border-b border-border md:mt-4 overflow-hidden transition-all duration-900 ease-in-out group-open:opacity-100 group-open:max-h-[600px] opacity-0 max-h-0">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-4 flex flex-col gap-4">
                  {leftLinks.map((link) => {
                    const isActive = link.href === `#${activeSection}`;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={(e) => {
                          const details = (e.target as HTMLElement).closest(
                            "details",
                          );
                          if (details) {
                            details.removeAttribute("open");
                          }
                        }}
                        className={cn(
                          "text-3xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground",
                          isActive && "font-bold text-accent",
                        )}
                      >
                        {link.label}
                      </a>
                    );
                  })}
                  {rightLinks.map((link) => {
                    const isActive = link.href === `#${activeSection}`;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={(e) => {
                          const details = (e.target as HTMLElement).closest(
                            "details",
                          );
                          if (details) {
                            details.removeAttribute("open");
                          }
                        }}
                        className={cn(
                          "text-3xl font-medium tracking-tight font-serif uppercase focus:outline-none text-foreground",
                          isActive && "font-bold text-accent",
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
        </nav>
      </div>
    </header>
  );
}

export { Navigation };
