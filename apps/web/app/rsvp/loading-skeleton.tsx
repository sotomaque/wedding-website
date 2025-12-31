import { Navigation } from "@workspace/ui/components/navigation";
import { NAVIGATION_CONFIG } from "../navigation-config";

export function RSVPLoadingSkeleton() {
  return (
    <div className="min-h-screen h-screen overflow-y-auto relative">
      {/* Background with gradient (placeholder for image) */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900 -z-10" />

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 -z-10" />

      {/* Navigation */}
      <div className="relative z-10">
        <Navigation
          brandImage={NAVIGATION_CONFIG.brandImage}
          leftLinks={NAVIGATION_CONFIG.leftLinks}
          rightLinks={NAVIGATION_CONFIG.rightLinks}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-white/20">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif text-foreground mb-2">
                Wedding RSVP
              </h1>
              <p className="text-muted-foreground">Helen & Enrique</p>
            </div>

            {/* Loading skeleton */}
            <div className="space-y-6 animate-pulse">
              <div className="space-y-4">
                {/* Input skeleton */}
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32" />
                <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>

              {/* Button skeleton */}
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-full" />

              {/* Additional content skeletons */}
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/90 text-sm mt-6 drop-shadow-lg">
            Having trouble? Contact us at{" "}
            <a
              href="mailto:sotomaque@gmail.com"
              className="underline font-semibold"
            >
              sotomaque@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
