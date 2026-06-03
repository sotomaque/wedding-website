import Image from "next/image";
import { useTranslations } from "next-intl";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type { StoryContent } from "@/lib/validations/wedding-content";
import type { HeroPhoto } from "./hero-section";

interface StorySectionProps {
  photos: HeroPhoto[];
  content?: StoryContent;
}

export function StorySection({ photos, content }: StorySectionProps) {
  const t = useTranslations("story");
  const [mainPhoto, ...secondaryPhotos] = photos;

  const hasText = Boolean(
    content?.bodyHtml || (content?.paragraphs ?? []).length > 0,
  );
  if (!mainPhoto && !hasText) return null;

  const storyBody = content?.bodyHtml ? (
    <div
      className="max-w-none [&_p]:my-3 [&_p]:text-lg [&_p]:leading-relaxed [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:underline text-foreground/85"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: admin rich text, sanitized via sanitizeRichText
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(content.bodyHtml) }}
    />
  ) : (
    (content?.paragraphs ?? []).map((paragraph) => (
      <p
        key={paragraph.substring(0, 20)}
        className="text-foreground/85 text-lg leading-relaxed mb-3"
      >
        {paragraph}
      </p>
    ))
  );

  return (
    <section id="story" className="py-24 px-6 bg-card scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-16 text-foreground">
          {content?.title ?? t("defaultTitle")}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
        {mainPhoto ? (
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
              {storyBody}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 text-muted-foreground leading-relaxed text-center md:text-left">
            {storyBody}
          </div>
        )}
        {secondaryPhotos.length > 0 && (
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
        )}
      </div>
    </section>
  );
}
