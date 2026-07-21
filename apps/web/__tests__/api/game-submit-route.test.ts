import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

const mockGameFindFirst = mock(
  () => Promise.resolve<unknown>(null) as Promise<unknown>,
);
const mockOptionFindMany = mock(
  () => Promise.resolve([{ id: "o1", questionId: "q1" }]) as Promise<unknown>,
);
const mockPlayerUpsert = mock(
  () => Promise.resolve({ id: "p1" }) as Promise<unknown>,
);
const mockAnswerDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockAnswerCreateMany = mock(() => Promise.resolve({ count: 0 }));

mock.module("@/lib/db", () => ({
  db: {
    game: { findFirst: mockGameFindFirst },
    gameOption: { findMany: mockOptionFindMany },
    gamePlayer: { upsert: mockPlayerUpsert },
    gameAnswer: {
      deleteMany: mockAnswerDeleteMany,
      createMany: mockAnswerCreateMany,
    },
    // The route wraps delete+create in a $transaction([...]) array.
    $transaction: mock((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

function req(body: unknown) {
  return new NextRequest("http://localhost/api/game/tok/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ token: "tok" }) };

const OPEN_GAME = { id: "g1", weddingId: "w1", status: "open" };

describe("POST /api/game/[token]/submit", () => {
  beforeEach(() => {
    mockGameFindFirst.mockReset();
    mockOptionFindMany.mockReset();
    mockPlayerUpsert.mockReset();
    mockAnswerCreateMany.mockClear();
    mockAnswerDeleteMany.mockClear();
    mockOptionFindMany.mockResolvedValue([{ id: "o1", questionId: "q1" }]);
    mockPlayerUpsert.mockResolvedValue({ id: "p1" });
  });

  it("returns 404 when the game token is unknown", async () => {
    mockGameFindFirst.mockResolvedValue(null);
    const { POST } = await import("@/app/api/game/[token]/submit/route");
    const res = await POST(req({ name: "Ada", answers: [] }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 409 when the game isn't open", async () => {
    mockGameFindFirst.mockResolvedValue({ ...OPEN_GAME, status: "closed" });
    const { POST } = await import("@/app/api/game/[token]/submit/route");
    const res = await POST(req({ name: "Ada", answers: [] }), ctx);
    expect(res.status).toBe(409);
  });

  it("returns 400 when the name is missing", async () => {
    mockGameFindFirst.mockResolvedValue(OPEN_GAME);
    const { POST } = await import("@/app/api/game/[token]/submit/route");
    const res = await POST(req({ answers: [] }), ctx);
    expect(res.status).toBe(400);
  });

  it("saves only answers whose option belongs to its question, and sets a cookie", async () => {
    mockGameFindFirst.mockResolvedValue(OPEN_GAME);
    const { POST } = await import("@/app/api/game/[token]/submit/route");
    const res = await POST(
      req({
        name: "Ada",
        answers: [
          { questionId: "q1", optionId: "o1" }, // valid
          { questionId: "q1", optionId: "oX" }, // foreign option — dropped
          { questionId: "q9", optionId: "o1" }, // option belongs to q1, not q9 — dropped
        ],
      }),
      ctx,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; answered: number };
    expect(data.success).toBe(true);
    expect(data.answered).toBe(1);

    const created = mockAnswerCreateMany.mock.calls[0]?.[0] as {
      data: { questionId: string; optionId: string; weddingId: string }[];
    };
    expect(created.data).toEqual([
      { playerId: "p1", questionId: "q1", optionId: "o1", weddingId: "w1" },
    ]);
    // A player cookie is set so the guest can return.
    expect(res.headers.get("set-cookie")).toContain("wg_g1=");
  });
});
