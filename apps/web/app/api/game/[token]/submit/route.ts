import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gameSubmitSchema } from "@/lib/validations/game";
import { featureTogglesSchema } from "@/lib/validations/wedding-content";

/** Cookie key for a guest's per-game player token (one game per cookie). */
function playerCookieName(gameId: string): string {
  return `wg_${gameId}`;
}

/**
 * Submit (or update) a guest's game answers — no auth, just a name.
 *
 * The guest is identified by an httpOnly per-device cookie so they can return
 * to tweak answers while the game is open and see their own score once it
 * closes. Answers are replaced wholesale on each submit. Only accepted while
 * the game is "open".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const game = await db.game.findFirst({
      where: { publicToken: token },
      select: {
        id: true,
        weddingId: true,
        status: true,
        wedding: { select: { featureToggles: true } },
      },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    // Honor the wedding's `game` feature toggle (the public page 404s when it's
    // off; the write endpoint must not stay open behind it).
    const toggles = featureTogglesSchema.parse(
      game.wedding.featureToggles ?? {},
    );
    if (!toggles.game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (game.status !== "open") {
      return NextResponse.json(
        { error: "This game isn't accepting answers right now." },
        { status: 409 },
      );
    }

    const parsed = gameSubmitSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter your name and try again." },
        { status: 400 },
      );
    }
    const { name, answers } = parsed.data;

    // Keep only answers whose option genuinely belongs to its stated question
    // in THIS game — so a tampered payload can't attach a foreign option.
    const options = await db.gameOption.findMany({
      where: { question: { gameId: game.id } },
      select: { id: true, questionId: true },
    });
    const optionQuestion = new Map(options.map((o) => [o.id, o.questionId]));
    const cleaned = answers.filter(
      (a) => optionQuestion.get(a.optionId) === a.questionId,
    );
    // One answer per question (last wins). The DB has UNIQUE(player_id,
    // question_id), so a duplicate questionId in the payload would otherwise
    // 500 the request mid-write.
    const deduped = [
      ...new Map(cleaned.map((a) => [a.questionId, a])).values(),
    ];

    // Identify the guest by their existing cookie, or mint a new token.
    const cookieName = playerCookieName(game.id);
    const existingToken = request.cookies.get(cookieName)?.value;
    const playerToken = existingToken || randomUUID();

    // Upsert the player and replace their answers atomically, so a failed
    // answer write can't leave the tiebreaker submittedAt bumped without the
    // matching answers, and concurrent submits can't interleave.
    await db.$transaction(async (tx) => {
      const player = await tx.gamePlayer.upsert({
        where: { gameId_token: { gameId: game.id, token: playerToken } },
        create: {
          gameId: game.id,
          weddingId: game.weddingId,
          name,
          token: playerToken,
          submittedAt: new Date(),
        },
        update: { name, submittedAt: new Date() },
        select: { id: true },
      });
      await tx.gameAnswer.deleteMany({ where: { playerId: player.id } });
      await tx.gameAnswer.createMany({
        data: deduped.map((a) => ({
          playerId: player.id,
          questionId: a.questionId,
          optionId: a.optionId,
          weddingId: game.weddingId,
        })),
      });
    });

    const response = NextResponse.json({
      success: true,
      answered: deduped.length,
    });
    response.cookies.set(cookieName, playerToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Error in POST /api/game/[token]/submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
