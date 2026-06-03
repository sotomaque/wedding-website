import Image from "next/image";
import type { HeroPhoto } from "./hero-section";

interface GallerySectionProps {
  photos: HeroPhoto[];
}

/**
 * Gallery section, Elegant-style. Vertical stack of large landscape photos,
 * each with a caption underneath. Renders exactly the photos the admin has
 * placed in the gallery section (no cap), in their per-section order — see
 * getPhotosBySection in lib/photos.ts. Each photo's `description` (falling
 * back to `alt`) is used as the caption.
 */
export function GallerySection({ photos }: GallerySectionProps) {
  if (photos.length === 0) return null;
  const galleryPhotos = photos;

  return (
    <section id="gallery" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Gallery
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="space-y-16">
          {galleryPhotos.map((photo) => (
            <figure key={photo.src} className="text-center">
              <div className="relative w-full aspect-16/10 overflow-hidden rounded-sm bg-secondary mb-4">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  // Gallery is centered inside a max-w-4xl wrapper (896px)
                  // with px-6 outside. Below md the image fills the viewport;
                  // above it the parent caps at the wrapper width.
                  sizes="(min-width: 896px) 896px, 100vw"
                  className="object-cover"
                />
              </div>
              {(photo.description || photo.alt) && (
                <figcaption className="font-serif text-lg md:text-xl text-foreground/85">
                  {photo.description || photo.alt}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
