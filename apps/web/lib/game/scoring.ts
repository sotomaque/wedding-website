/**
 * Pure scoring + tally helpers for the newlywed guessing game.
 *
 * DB-free so they're trivially unit-testable and shared by the public results
 * page and the admin leaderboard. "Scored" questions are those the couple has
 * revealed a correct answer for; a question with no correct answer is unscored
 * and only ever shows the crowd's most-picked option.
 */

export interface GameQuestionLike {
  id: string;
  correctOptionId: string | null;
}

export interface GameAnswerLike {
  playerId: string;
  questionId: string;
  optionId: string;
}

export interface PlayerLike {
  id: string;
  name: string;
}

export interface RankedPlayer {
  id: string;
  name: string;
  /** Correct guesses among revealed questions. */
  correct: number;
  /** Questions the player answered at all. */
  answered: number;
  /** Competition rank (1-based); ties share a rank. */
  rank: number;
  /** True for the top-scoring player(s) once at least one answer is revealed. */
  isWinner: boolean;
}

export interface OptionTally {
  optionId: string;
  count: number;
}

export interface QuestionTally {
  tallies: OptionTally[];
  total: number;
  /** Option id with the most votes (first on ties); null when no one answered. */
  topOptionId: string | null;
}

/** questionId → correctOptionId, for questions whose answer has been revealed. */
export function revealedCorrectMap(
  questions: GameQuestionLike[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const q of questions) {
    if (q.correctOptionId) map.set(q.id, q.correctOptionId);
  }
  return map;
}

/** Number of questions with a revealed correct answer. */
export function revealedCount(questions: GameQuestionLike[]): number {
  return revealedCorrectMap(questions).size;
}

/**
 * Rank players by correct guesses (desc), ties broken by name for stable order
 * but sharing a competition rank. Winners are the top scorers once anything is
 * revealed and someone has at least one correct guess.
 */
export function rankPlayers(
  players: PlayerLike[],
  questions: GameQuestionLike[],
  answers: GameAnswerLike[],
): RankedPlayer[] {
  const correct = revealedCorrectMap(questions);
  const anyRevealed = correct.size > 0;

  const stats = new Map<string, { correct: number; answered: number }>();
  for (const p of players) stats.set(p.id, { correct: 0, answered: 0 });
  for (const a of answers) {
    const s = stats.get(a.playerId);
    if (!s) continue;
    s.answered += 1;
    if (correct.get(a.questionId) === a.optionId) s.correct += 1;
  }

  const rows = players
    .map((p) => {
      const s = stats.get(p.id) ?? { correct: 0, answered: 0 };
      return {
        id: p.id,
        name: p.name,
        correct: s.correct,
        answered: s.answered,
      };
    })
    .sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name));

  const maxCorrect = rows.length > 0 ? (rows[0]?.correct ?? 0) : 0;

  let prevCorrect: number | null = null;
  let prevRank = 0;
  return rows.map((row, index) => {
    const rank = row.correct === prevCorrect ? prevRank : index + 1;
    prevCorrect = row.correct;
    prevRank = rank;
    return {
      ...row,
      rank,
      isWinner: anyRevealed && maxCorrect > 0 && row.correct === maxCorrect,
    };
  });
}

/** Per-option vote counts for one question, plus the crowd's top pick. */
export function tallyQuestion(
  options: { id: string }[],
  answers: GameAnswerLike[],
  questionId: string,
): QuestionTally {
  const counts = new Map<string, number>(options.map((o) => [o.id, 0]));
  let total = 0;
  for (const a of answers) {
    if (a.questionId !== questionId) continue;
    const current = counts.get(a.optionId);
    if (current === undefined) continue; // stale option, ignore
    counts.set(a.optionId, current + 1);
    total += 1;
  }

  let topOptionId: string | null = null;
  let topCount = 0;
  for (const option of options) {
    const count = counts.get(option.id) ?? 0;
    if (count > topCount) {
      topCount = count;
      topOptionId = option.id;
    }
  }

  return {
    tallies: options.map((o) => ({
      optionId: o.id,
      count: counts.get(o.id) ?? 0,
    })),
    total: total,
    topOptionId,
  };
}
