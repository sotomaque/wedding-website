/**
 * Data loaders for the newlywed guessing game — shared by the public play /
 * results page and the admin editor. One game per wedding.
 */

import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

export interface GameOptionView {
  id: string;
  label: string;
}

export interface GameQuestionView {
  id: string;
  prompt: string;
  correctOptionId: string | null;
  options: GameOptionView[];
}

export interface PublicGame {
  id: string;
  weddingId: string;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed";
  publicToken: string | null;
  questions: GameQuestionView[];
}

/** The game behind a public share token (any status), with questions + options. */
export async function getGameByToken(
  token: string,
): Promise<PublicGame | null> {
  const game = await db.game.findFirst({
    where: { publicToken: token },
    include: {
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!game) return null;
  return {
    id: game.id,
    weddingId: game.weddingId,
    title: game.title,
    description: game.description,
    status: game.status as PublicGame["status"],
    publicToken: game.publicToken,
    questions: game.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      correctOptionId: q.correctOptionId,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    })),
  };
}

export interface GamePlayerResult {
  id: string;
  name: string;
  /** When the guest locked in their (final) answers — the speed tiebreaker. */
  submittedAt: Date | null;
}

/** All players + their answers for a game (for tally + leaderboard). */
export async function getGameResponses(gameId: string): Promise<{
  players: GamePlayerResult[];
  answers: { playerId: string; questionId: string; optionId: string }[];
}> {
  const [players, answers] = await Promise.all([
    db.gamePlayer.findMany({
      where: { gameId, submittedAt: { not: null } },
      select: { id: true, name: true, submittedAt: true },
      orderBy: { submittedAt: "asc" },
    }),
    db.gameAnswer.findMany({
      where: { player: { gameId, submittedAt: { not: null } } },
      select: { playerId: true, questionId: true, optionId: true },
    }),
  ]);
  return { players, answers };
}

/** A returning guest's saved answers for a game, looked up by their cookie token. */
export async function getPlayerByToken(
  gameId: string,
  token: string,
): Promise<{
  id: string;
  name: string;
  answers: { questionId: string; optionId: string }[];
} | null> {
  const player = await db.gamePlayer.findUnique({
    where: { gameId_token: { gameId, token } },
    include: { answers: { select: { questionId: true, optionId: true } } },
  });
  if (!player) return null;
  return { id: player.id, name: player.name, answers: player.answers };
}

/** The current wedding's game for the admin editor (full detail), or null. */
export async function getAdminGame() {
  const weddingId = await getWeddingId();
  return db.game.findFirst({
    where: { weddingId },
    include: {
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      },
      _count: {
        select: { players: { where: { submittedAt: { not: null } } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
