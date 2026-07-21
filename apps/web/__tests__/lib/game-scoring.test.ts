import { describe, expect, it } from "bun:test";
import {
  type GameAnswerLike,
  type GameQuestionLike,
  rankPlayers,
  revealedCount,
  tallyQuestion,
} from "@/lib/game/scoring";

// 3 questions; q1 → oA correct, q2 → oC correct, q3 → not revealed.
const questions: GameQuestionLike[] = [
  { id: "q1", correctOptionId: "q1oA" },
  { id: "q2", correctOptionId: "q2oC" },
  { id: "q3", correctOptionId: null },
];

const players = [
  { id: "p1", name: "Ada" },
  { id: "p2", name: "Grace" },
  { id: "p3", name: "Zoe" },
];

const answers: GameAnswerLike[] = [
  // Ada: q1 right, q2 wrong, q3 answered → 1 correct
  { playerId: "p1", questionId: "q1", optionId: "q1oA" },
  { playerId: "p1", questionId: "q2", optionId: "q2oD" },
  { playerId: "p1", questionId: "q3", optionId: "q3oX" },
  // Grace: q1 right, q2 right → 2 correct
  { playerId: "p2", questionId: "q1", optionId: "q1oA" },
  { playerId: "p2", questionId: "q2", optionId: "q2oC" },
  // Zoe: q1 wrong → 0 correct
  { playerId: "p3", questionId: "q1", optionId: "q1oB" },
];

describe("revealedCount", () => {
  it("counts only questions with a revealed answer", () => {
    expect(revealedCount(questions)).toBe(2);
    expect(revealedCount([{ id: "x", correctOptionId: null }])).toBe(0);
  });
});

describe("rankPlayers", () => {
  it("ranks by correct guesses and flags the winner", () => {
    const ranked = rankPlayers(players, questions, answers);
    expect(ranked.map((r) => [r.name, r.correct, r.answered, r.rank])).toEqual([
      ["Grace", 2, 2, 1],
      ["Ada", 1, 3, 2],
      ["Zoe", 0, 1, 3],
    ]);
    expect(ranked.filter((r) => r.isWinner).map((r) => r.name)).toEqual([
      "Grace",
    ]);
  });

  it("breaks a tie by earliest submission — first to submit wins", () => {
    // Both guessed q1 correctly (1 each), but Grace submitted before Ada.
    const tiedAnswers: GameAnswerLike[] = [
      { playerId: "p1", questionId: "q1", optionId: "q1oA" }, // Ada 1
      { playerId: "p2", questionId: "q1", optionId: "q1oA" }, // Grace 1
    ];
    const timed = [
      { id: "p1", name: "Ada", submittedAt: new Date("2026-07-30T12:05:00Z") },
      {
        id: "p2",
        name: "Grace",
        submittedAt: new Date("2026-07-30T12:01:00Z"),
      },
    ];
    const ranked = rankPlayers(timed, questions, tiedAnswers);
    expect(ranked.map((r) => [r.name, r.rank, r.isWinner])).toEqual([
      ["Grace", 1, true],
      ["Ada", 2, false],
    ]);
  });

  it("co-wins only when correct count AND submission time are identical", () => {
    const t = new Date("2026-07-30T12:00:00Z");
    const tiedAnswers: GameAnswerLike[] = [
      { playerId: "p1", questionId: "q1", optionId: "q1oA" },
      { playerId: "p2", questionId: "q1", optionId: "q1oA" },
    ];
    const timed = [
      { id: "p1", name: "Ada", submittedAt: t },
      { id: "p2", name: "Grace", submittedAt: t },
    ];
    const ranked = rankPlayers(timed, questions, tiedAnswers);
    expect(ranked.every((r) => r.rank === 1)).toBe(true);
    expect(ranked.filter((r) => r.isWinner).map((r) => r.name)).toEqual([
      "Ada",
      "Grace",
    ]);
  });

  it("has no winner before any answer is revealed", () => {
    const unrevealed: GameQuestionLike[] = [
      { id: "q1", correctOptionId: null },
    ];
    const ranked = rankPlayers(players, unrevealed, answers);
    expect(ranked.some((r) => r.isWinner)).toBe(false);
  });
});

describe("tallyQuestion", () => {
  const options = [{ id: "q1oA" }, { id: "q1oB" }];

  it("counts votes per option and finds the crowd's top pick", () => {
    const t = tallyQuestion(options, answers, "q1");
    expect(t.total).toBe(3);
    expect(t.tallies).toEqual([
      { optionId: "q1oA", count: 2 },
      { optionId: "q1oB", count: 1 },
    ]);
    expect(t.topOptionId).toBe("q1oA");
  });

  it("returns a null top pick when nobody answered", () => {
    const t = tallyQuestion(options, answers, "q_none");
    expect(t.total).toBe(0);
    expect(t.topOptionId).toBeNull();
  });
});
