"use client";

import { cn } from "@workspace/ui/lib/utils";

interface ImageSkeletonProps {
  className?: string;
}

export function ImageSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-muted animate-pulse",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent",
        "before:animate-[shimmer_2s_infinite]",
        className,
      )}
      aria-hidden="true"
    />
  );
}
