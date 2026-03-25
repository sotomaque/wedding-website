import Image from "next/image";
import { useTranslations } from "next-intl";
import type { StoryContent } from "@/lib/validations/wedding-content";
import type { HeroPhoto } from "./hero-section";

interface StorySectionProps {
  photos: HeroPhoto[];
  content?: StoryContent;
}

export function StorySection({ photos, content }: StorySectionProps) {
  const t = useTranslations("story");
  const [mainPhoto, ...secondaryPhotos] = photos;

  if (!mainPhoto) return null;

  return (
    <section id="story" className="py-24 px-6 bg-card scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
          {content?.title ?? t("defaultTitle")}
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
            {content?.bodyHtml ? (
              <div
                className="prose prose-sm max-w-none [&_p]:my-2 [&_h2]:text-xl [&_h2]:font-serif [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-1 text-muted-foreground"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is generated server-side by admin via Tiptap editor
                dangerouslySetInnerHTML={{ __html: content.bodyHtml }}
              />
            ) : (
              (content?.paragraphs ?? []).map((paragraph) => (
                <p key={paragraph.substring(0, 20)}>{paragraph}</p>
              ))
            )}
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
