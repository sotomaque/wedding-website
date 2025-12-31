"use client";

import { ImageSkeleton } from "@workspace/ui/components/image-skeleton";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function LoadingImage(props: ImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <ImageSkeleton />}
      <Image
        {...props}
        onLoad={() => setIsLoading(false)}
        className={props.className}
      />
    </>
  );
}
