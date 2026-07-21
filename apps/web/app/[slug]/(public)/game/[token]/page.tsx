import { Footer } from "@workspace/ui/components/footer";
import { Check, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { WeddingNavigation } from "@/components/wedding-navigation";
import { db } from "@/lib/db";
import {
  getGameByToken,
  getGameResponses,
  getPlayerByToken,
} from "@/lib/db/game";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { rankPlayers, tallyQuestion } from "@/lib/game/scoring";
import { GamePlay } from "./game-play";

export const dynamic = "force-dynamic";

/** Minimal game + couple lookup for the rich link preview (cached per request). */
const getGameMeta = cache(async (token: string) => {
  return db.game.findFirst({
    where: { publicToken: token },
    select: {
      title: true,
      description: true,
      status: true,
      wedding: { select: { coupleName: true } },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const game = await getGameMeta(token);
  // Draft/unknown links get a neutral title (the page itself 404s).
  if (!game || game.status === "draft") return { title: "Wedding Game" };

  const couple = game.wedding.coupleName;
  const title = game.title;
  const description =
    game.status === "closed"
      ? `See the results — did you guess ${couple} right?`
      : game.description?.trim() ||
        `Guess who's most likely to… Play ${couple}'s wedding game!`;
  const siteName = `${couple}'s Wedding`;

  return {
    title,
    description,
    // The opengraph-image.tsx in this segment supplies og:image automatically.
    openGraph: { title, description, siteName, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const game = await getGameByToken(token);
  // Draft games aren't shareable yet; unknown tokens 404.
  if (!game || game.status === "draft") notFound();

  const settings = await getWeddingSettings();
  if (!settings.featureToggles.game) notFound();

  const cookieStore = await cookies();
  const playerToken = cookieStore.get(`wg_${game.id}`)?.value;
  const player = playerToken
    ? await getPlayerByToken(game.id, playerToken)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <WeddingNavigation />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 md:px-6 py-10">
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">
            Wedding Game
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">{game.title}</h1>
          {game.description && (
            <p className="text-muted-foreground mt-3">{game.description}</p>
          )}
        </div>

        {game.status === "open" ? (
          <GamePlay
            token={token}
            coupleName={settings.coupleName}
            questions={game.questions}
            initialName={player?.name ?? ""}
            initialAnswers={player?.answers ?? []}
            alreadyPlayed={Boolean(player)}
          />
        ) : (
          <GameResults game={game} currentPlayerId={player?.id ?? null} />
        )}
      </main>
      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}

async function GameResults({
  game,
  currentPlayerId,
}: {
  game: NonNullable<Awaited<ReturnType<typeof getGameByToken>>>;
  currentPlayerId: string | null;
}) {
  const { players, answers } = await getGameResponses(game.id);
  const ranked = rankPlayers(players, game.questions, answers);
  const winners = ranked.filter((r) => r.isWinner);
  const you = ranked.find((r) => r.id === currentPlayerId) ?? null;

  return (
    <div className="space-y-8">
      {/* Winner banner */}
      <div className="rounded-xl border bg-card p-6 text-center">
        {winners.length > 0 ? (
          <>
            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">
              {winners.length === 1 ? "Winner" : "Winners"}:{" "}
              {winners.map((w) => w.name).join(", ")}
            </h2>
            <p className="text-muted-foreground mt-1">
              {winners[0]?.correct} correct out of{" "}
              {game.questions.filter((q) => q.correctOptionId).length} revealed
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            The answers are being revealed — check back soon to see the winner!
          </p>
        )}
        {you && (
          <p className="mt-3 text-sm">
            You got <span className="font-semibold">{you.correct}</span> right —
            rank #{you.rank} of {ranked.length}.
          </p>
        )}
      </div>

      {/* Per-question results */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          The answers
        </h3>
        {game.questions.map((q, i) => {
          const tally = tallyQuestion(q.options, answers, q.id);
          const revealed = q.correctOptionId;
          const crowd = tally.topOptionId;
          return (
            <div key={q.id} className="border rounded-xl bg-card p-5">
              <p className="font-medium mb-3">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {q.prompt}
              </p>
              <div className="space-y-2">
                {q.options.map((o) => {
                  const count =
                    tally.tallies.find((t) => t.optionId === o.id)?.count ?? 0;
                  const pct =
                    tally.total > 0
                      ? Math.round((count / tally.total) * 100)
                      : 0;
                  const isCorrect = revealed === o.id;
                  const isCrowd = !revealed && crowd === o.id;
                  return (
                    <div key={o.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span
                          className={`flex items-center gap-1.5 ${
                            isCorrect ? "font-semibold text-green-700" : ""
                          }`}
                        >
                          {isCorrect && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                          {o.label}
                          {isCorrect && (
                            <span className="text-xs text-green-700">
                              (correct)
                            </span>
                          )}
                          {isCrowd && (
                            <span className="text-xs text-muted-foreground">
                              (crowd's pick)
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isCorrect ? "bg-green-500" : "bg-primary/50"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {!revealed && (
                <p className="text-xs text-muted-foreground mt-2">
                  No official answer on this one — just for fun.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      {ranked.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Leaderboard
          </h3>
          <div className="border rounded-xl bg-card divide-y">
            {ranked.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between px-4 py-2.5 ${
                  r.id === currentPlayerId ? "bg-primary/5" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums w-6">
                    #{r.rank}
                  </span>
                  <span className={r.isWinner ? "font-semibold" : ""}>
                    {r.name}
                  </span>
                  {r.isWinner && <Trophy className="w-4 h-4 text-amber-500" />}
                  {r.id === currentPlayerId && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </span>
                <span className="text-sm tabular-nums">{r.correct}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
