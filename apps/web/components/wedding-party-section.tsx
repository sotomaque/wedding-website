import { User } from "lucide-react";
import type { WeddingPartyContent } from "@/lib/validations/wedding-content";

/**
 * Wedding Party — Lovebird-style 3-column grid of circular member avatars
 * with name + role beneath. WYSIWYG: renders exactly the wedding's
 * `wedding-party` content (what the admin sees in the editor). Returns
 * `null` when there is no content or the members list is empty, so the
 * layout iteration skips the section entirely (matches the gallery-empty
 * filter pattern).
 */

const DEFAULT_TITLE = "Wedding Party";

interface WeddingPartySectionProps {
  content?: WeddingPartyContent;
}

export function WeddingPartySection({ content }: WeddingPartySectionProps) {
  const title = content?.title?.trim() || DEFAULT_TITLE;

  if (!content || content.members.length === 0) {
    return null;
  }

  const members = content.members;

  return (
    <section
      id="wedding-party"
      className="py-24 px-6 bg-background scroll-mt-24"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          {title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
          {members.map((member) => (
            <div key={member.id} className="text-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                {member.photoUrl ? (
                  // biome-ignore lint/performance/noImgElement: photoUrl is an arbitrary upload host (UploadThing CDN)
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User
                    aria-hidden="true"
                    className="size-12 text-foreground/30"
                    strokeWidth={1.25}
                  />
                )}
              </div>
              <p className="font-serif text-lg md:text-xl text-foreground">
                {member.name}
              </p>
              <p className="text-sm text-foreground/75 mt-1">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
