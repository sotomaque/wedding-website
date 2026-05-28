import { User } from "lucide-react";

/**
 * Wedding Party — Lovebird-style 3-column grid of circular member avatars
 * with name + role beneath. Currently renders a hardcoded sample so the
 * Elegant template has a visible block; the real feature (a
 * `WeddingPartyMember` Prisma model + admin CRUD + per-member photo upload)
 * is Phase 3. When that ships this component takes members as a prop.
 */

interface WeddingPartyMember {
  name: string;
  role: string;
  photoUrl: string | null;
}

const PLACEHOLDER_MEMBERS: WeddingPartyMember[] = [
  { name: "Lauren Johnson", role: "Maid of Honor", photoUrl: null },
  { name: "Jackie Mueller", role: "Bridesmaid", photoUrl: null },
  { name: "Cheryl Clarke", role: "Bridesmaid", photoUrl: null },
  { name: "Kenneth Massey", role: "Best Man", photoUrl: null },
  { name: "Howard Brown", role: "Groomsman", photoUrl: null },
  { name: "Jake Holland", role: "Groomsman", photoUrl: null },
];

export function WeddingPartySection() {
  const members = PLACEHOLDER_MEMBERS;

  return (
    <section
      id="wedding-party"
      className="py-24 px-6 bg-background scroll-mt-24"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Wedding Party
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
          {members.map((member) => (
            <div key={`${member.name}-${member.role}`} className="text-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                {member.photoUrl ? (
                  // biome-ignore lint/performance/noImgElement: photoUrl may be any host; placeholder until Phase 3 schema lands
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
