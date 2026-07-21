import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAdminGame } from "@/lib/db/game";
import { weddingUrl } from "@/lib/url";
import { CreateGameButton } from "./create-game-button";
import { GameAdmin } from "./game-admin";

export const dynamic = "force-dynamic";

export default async function AdminGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const game = await getAdminGame();

  return (
    <div className="max-w-screen-md mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Wedding Game</h1>
        <p className="text-muted-foreground">
          A "who's most likely to…" guessing game. Share the link, guests guess,
          you reveal the answers (now or after the wedding) and crown the
          winner.
        </p>
      </div>

      {game ? (
        <GameAdmin
          game={{
            id: game.id,
            title: game.title,
            description: game.description,
            status: game.status as "draft" | "open" | "closed",
            publicToken: game.publicToken,
            questions: game.questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              correctOptionId: q.correctOptionId,
              options: q.options.map((o) => ({ id: o.id, label: o.label })),
            })),
            playerCount: game._count.players,
          }}
          publicUrl={
            game.publicToken
              ? weddingUrl(slug, `/game/${game.publicToken}`)
              : null
          }
        />
      ) : (
        <CreateGameButton />
      )}
    </div>
  );
}
