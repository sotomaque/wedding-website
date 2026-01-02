import Image from "next/image";

import { type HeroPhoto, STORY_CONTENT } from "../app/constants";

interface StorySectionProps {
  photos: HeroPhoto[];
}

export function StorySection({ photos }: StorySectionProps) {
  const [mainPhoto, ...secondaryPhotos] = photos;

  if (!mainPhoto) return null;

  return (
    <section id="story" className="py-24 px-6 bg-card scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
          {STORY_CONTENT.title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden group">
            <Image
              src={mainPhoto.src}
              alt={mainPhoto.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-white text-lg font-serif tracking-wide">
                  {mainPhoto.description}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            {STORY_CONTENT.paragraphs.map((paragraph) => (
              <p key={paragraph.substring(0, 20)}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {secondaryPhotos.map((image) => (
            <div
              key={image.src}
              className="relative aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white text-lg font-serif tracking-wide">
                    {image.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
