"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface RegistryCardProps {
  gift: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    emoji: string | null;
    stripeUrl: string | null;
    itemType: "fund" | "product";
    productUrl: string | null;
    priceCents: number | null;
    isClaimed: boolean;
  };
  index: number;
}

export function RegistryCard({ gift, index }: RegistryCardProps) {
  const t = useTranslations("registry");
  const router = useRouter();
  const [claimOpen, setClaimOpen] = useState(false);
  const [unclaimOpen, setUnclaimOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [unclaimEmail, setUnclaimEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isProduct = gift.itemType === "product";
  const price =
    gift.priceCents != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(gift.priceCents / 100)
      : null;

  async function handleClaim() {
    if (!name.trim() || !email.trim()) {
      toast.error(t("claimError"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: gift.id, name, email }),
      });
      if (res.ok) {
        toast.success(t("claimSuccess"));
        setClaimOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? t("claimError"));
        // Reflect a race-lost claim immediately.
        if (res.status === 409) router.refresh();
      }
    } catch {
      toast.error(t("claimError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnclaim() {
    if (!unclaimEmail.trim()) {
      toast.error(t("claimError"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/registry/claim", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: gift.id, email: unclaimEmail }),
      });
      if (res.ok) {
        toast.success(t("unclaimSuccess"));
        setUnclaimOpen(false);
        setUnclaimEmail("");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? t("unclaimError"));
      }
    } catch {
      toast.error(t("unclaimError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="bg-card rounded-lg shadow-sm border border-accent/30 overflow-hidden
        transition-all duration-500 ease-out
        hover:shadow-lg hover:border-accent/50 hover:-translate-y-1
        animate-fade-in-up"
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      {gift.imageUrl && (
        <div className="relative w-full h-64">
          <Image
            src={gift.imageUrl}
            alt={gift.title}
            fill
            className={`object-cover ${gift.isClaimed ? "opacity-60 grayscale" : ""}`}
          />
        </div>
      )}

      <div className="p-8">
        <div className="flex items-center gap-3 mb-4">
          {gift.emoji && <span className="text-3xl">{gift.emoji}</span>}
          <h3 className="text-2xl font-serif text-foreground">{gift.title}</h3>
        </div>

        {gift.description && (
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {gift.description}
          </p>
        )}

        {price && (
          <p className="text-lg font-medium text-foreground mb-4">{price}</p>
        )}

        {isProduct ? (
          gift.isClaimed ? (
            <div className="space-y-2">
              <Button className="w-full font-semibold" size="lg" disabled>
                {t("taken")}
              </Button>
              <button
                type="button"
                onClick={() => setUnclaimOpen(true)}
                className="w-full text-center text-xs text-muted-foreground underline hover:text-foreground"
              >
                {t("unclaimPrompt")}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {gift.productUrl && (
                <a
                  href={gift.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full" size="lg">
                    {t("viewItem")}
                  </Button>
                </a>
              )}
              <Button
                className="w-full font-semibold"
                size="lg"
                onClick={() => setClaimOpen(true)}
              >
                {t("claim")}
              </Button>
            </div>
          )
        ) : gift.stripeUrl ? (
          <a
            href={gift.stripeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full font-semibold" size="lg">
              {t("contribute")}
            </Button>
          </a>
        ) : (
          <Button className="w-full font-semibold" size="lg" disabled>
            {t("comingSoon")}
          </Button>
        )}
      </div>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("claimTitle")}</DialogTitle>
            <DialogDescription>{t("claimSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`claim-name-${gift.id}`}>{t("claimName")}</Label>
              <Input
                id={`claim-name-${gift.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`claim-email-${gift.id}`}>
                {t("claimEmail")}
              </Label>
              <Input
                id={`claim-email-${gift.id}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClaimOpen(false)}
              disabled={isSubmitting}
            >
              {t("claimCancel")}
            </Button>
            <Button onClick={handleClaim} disabled={isSubmitting}>
              {isSubmitting ? t("claimSubmitting") : t("claimConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unclaimOpen} onOpenChange={setUnclaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unclaimTitle")}</DialogTitle>
            <DialogDescription>{t("unclaimSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`unclaim-email-${gift.id}`}>
                {t("claimEmail")}
              </Label>
              <Input
                id={`unclaim-email-${gift.id}`}
                type="email"
                value={unclaimEmail}
                onChange={(e) => setUnclaimEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnclaimOpen(false)}
              disabled={isSubmitting}
            >
              {t("claimCancel")}
            </Button>
            <Button onClick={handleUnclaim} disabled={isSubmitting}>
              {isSubmitting ? t("unclaimSubmitting") : t("unclaimConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
