"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRegistryWishlistUrl } from "./actions";

interface RegistrySettingsProps {
  initialWishlistUrl: string | null;
}

/**
 * Registry-level settings shown above the item list: an external wishlist link
 * (e.g. Amazon) and a collapsible guide for creating a Stripe payment link to
 * paste into cash-fund items.
 */
export function RegistrySettings({
  initialWishlistUrl,
}: RegistrySettingsProps) {
  const [wishlistUrl, setWishlistUrl] = useState(initialWishlistUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [showStripeHelp, setShowStripeHelp] = useState(false);

  function handleSaveWishlist() {
    startTransition(async () => {
      const result = await updateRegistryWishlistUrl(wishlistUrl);
      if (result.success) {
        toast.success("Wishlist link saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-6 rounded-lg border border-border p-4 mb-8">
      {/* External wishlist link */}
      <div className="space-y-2 max-w-xl">
        <Label htmlFor="wishlist-url">Wishlist link (optional)</Label>
        <div className="flex gap-2">
          <Input
            id="wishlist-url"
            type="url"
            value={wishlistUrl}
            onChange={(e) => setWishlistUrl(e.target.value)}
            placeholder="https://www.amazon.com/wedding/registry/..."
          />
          <Button onClick={handleSaveWishlist} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Link an external registry (e.g. an Amazon wishlist). It appears as a
          button at the top of your public registry page. Note: items there are
          tracked by that site — only individual items you add below can be
          marked &quot;claimed&quot; here.
        </p>
      </div>

      {/* Stripe payment-link guide */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowStripeHelp((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showStripeHelp ? "" : "-rotate-90"}`}
          />
          How do I create a Stripe payment link for a cash fund?
        </button>
        {showStripeHelp && (
          <div className="mt-3 space-y-2 text-sm text-muted-foreground pl-6">
            <p>
              Cash-fund items link out to a Stripe payment link that you create
              in your own Stripe account. To set one up:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Sign in to the Stripe Dashboard and open{" "}
                <a
                  href="https://dashboard.stripe.com/payment-links"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Payment links
                  <ExternalLink className="h-3 w-3" />
                </a>
                .
              </li>
              <li>
                Click <strong>New</strong>, add a product (e.g. &quot;Honeymoon
                Fund&quot;), and choose <strong>Customer chooses price</strong>{" "}
                so guests can give any amount.
              </li>
              <li>
                Create the link, then copy its{" "}
                <code>https://buy.stripe.com/…</code> URL.
              </li>
              <li>
                Add a registry item below, set its type to{" "}
                <strong>Cash fund</strong>, and paste the link into the{" "}
                <strong>Stripe payment link</strong> field.
              </li>
            </ol>
            <p>
              Completed contributions appear automatically under{" "}
              <strong>Gifts</strong> once Stripe webhooks are configured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
