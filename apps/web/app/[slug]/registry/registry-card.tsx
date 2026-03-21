"use client";

import { Button } from "@workspace/ui/components/button";
import Image from "next/image";
import type { RegistryGift } from "./constants";

interface RegistryCardProps {
  gift: RegistryGift;
  index: number;
}

export function RegistryCard({ gift, index }: RegistryCardProps) {
  return (
    <div
      className="bg-card rounded-lg shadow-sm border border-accent/30 overflow-hidden
        transition-all duration-500 ease-out
        hover:shadow-lg hover:border-accent/50 hover:-translate-y-1
        animate-fade-in-up"
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      <div className="relative w-full h-64">
        <Image
          src={gift.image}
          alt={gift.title}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{gift.emoji}</span>
          <h3 className="text-2xl font-serif text-foreground">{gift.title}</h3>
        </div>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          {gift.description}
        </p>

        {gift.stripeUrl ? (
          <a
            href={gift.stripeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full font-semibold" size="lg">
              Contribute
            </Button>
          </a>
        ) : (
          <Button className="w-full font-semibold" size="lg" disabled>
            Coming Soon
          </Button>
        )}
      </div>
    </div>
  );
}
