"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export interface HeroPhoto {
  src: string;
  alt: string;
  description: string;
}

interface HeroSectionProps {
  photos: HeroPhoto[];
  title?: string;
  /**
   * Optional couple-names display (e.g. "Harper & James"). When provided,
   * renders centered over the hero in the heading font — without the
   * uppercase / wide-tracking treatment used for `title` — so script display
   * fonts (Sacramento, etc.) read naturally. Used by template layouts that
   * want a Elegant-style hero. When unset, the hero falls back to the
   * existing uppercase `title` rendering.
   */
  coupleNamesDisplay?: string;
}

/**
 * Photo-carousel hero variant. Always called with a non-empty `photos`
 * array — the empty-state hero is HeroSectionEmpty (RSC) so brand-new
 * weddings don't pay the carousel JS cost. The page picks between them
 * based on photos.length.
 */
export function HeroSection({
  photos,
  title,
  coupleNamesDisplay,
}: HeroSectionProps) {
  const [api, setApi] = useState<CarouselApi>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to start/restart the auto-scroll timer
  const startAutoScroll = useCallback(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start new interval
    if (api) {
      intervalRef.current = setInterval(() => {
        api.scrollNext();
      }, 6000);
    }
  }, [api]);

  // Set up auto-scroll
  useEffect(() => {
    if (!api) {
      return;
    }

    startAutoScroll();

    // Listen for user interactions to reset timer
    const handleSelect = () => {
      startAutoScroll();
    };

    api.on("select", handleSelect);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      api.off("select", handleSelect);
    };
  }, [api, startAutoScroll]);

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
        <div className="relative h-[calc(100dvh-8rem)]">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            setApi={setApi}
            className="w-full h-full"
          >
            <CarouselContent className="h-[calc(100dvh-8rem)]">
              {photos.map((photo, index) => (
                <CarouselItem key={photo.src} className="h-full">
                  <div className="relative h-full w-full">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-cover object-center"
                      priority={index === 0}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 bg-background/80 hover:bg-background border-accent/30" />
            <CarouselNext className="right-4 bg-background/80 hover:bg-background border-accent/30" />
          </Carousel>
          {/* Overlay with title (or script couple names for Elegant-style templates) */}
          <div className="absolute inset-0 flex flex-col items-center text-center justify-center bg-black/30 pointer-events-none">
            {coupleNamesDisplay ? (
              <h1 className="text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-display text-white drop-shadow-lg leading-tight">
                {coupleNamesDisplay}
              </h1>
            ) : (
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-white uppercase opacity-50 drop-shadow-lg tracking-widest">
                {title}
              </h1>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
