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

import { HERO_CONTENT, type HeroPhoto } from "../app/constants";

interface HeroSectionProps {
  photos: HeroPhoto[];
}

export function HeroSection({ photos }: HeroSectionProps) {
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

  if (photos.length === 0) {
    return null;
  }

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
          {/* Overlay with title */}
          <div className="absolute inset-0 flex flex-col items-center text-center justify-center bg-black/30 pointer-events-none">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-white uppercase opacity-50 drop-shadow-lg tracking-widest">
              {HERO_CONTENT.title}
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
