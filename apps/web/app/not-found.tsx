import { Button } from "@workspace/ui/components/button";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-medium text-foreground">
            404
          </h1>
          <p className="text-xl font-serif text-foreground">Page not found</p>
          <p className="text-muted-foreground text-sm">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">My weddings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
