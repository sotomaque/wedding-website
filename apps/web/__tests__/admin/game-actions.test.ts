import { beforeEach, describe, expect, it, mock } from "bun:test";

// Real requireAdmin/isAdmin authorizes via the ADMIN_EMAILS superadmin path —
// so we drive the underlying clerk/env/db mocks rather than stubbing the auth
// module (which would leak into sibling route tests that use the real one).
mock.module("@/env", () => ({ env: { ADMIN_EMAILS: "admin@example.com" } }));

const mockCurrentUser = mock(() =>
  Promise.resolve<unknown>({
    id: "admin-1",
    primaryEmailAddressId: "e",
    emailAddresses: [
      {
        id: "e",
        emailAddress: "admin@example.com",
        verification: { status: "verified" },
      },
    ],
  }),
);
mock.module("@clerk/nextjs/server", () => ({ currentUser: mockCurrentUser }));

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("w1")),
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "w1", slug: "test-wedding" }),
  ),
}));

mock.module("next/cache", () => ({ revalidatePath: mock(() => undefined) }));

const gameUpdateMany = mock(() => Promise.resolve({ count: 1 }));
const questionAggregate = mock(() =>
  Promise.resolve({ _max: { displayOrder: 2 } }),
);
const questionCreate = mock(() => Promise.resolve({ id: "q-new" }));
const questionFindFirst = mock(
  () => Promise.resolve({ id: "g1" }) as Promise<unknown>,
);
const questionUpdateMany = mock(() => Promise.resolve({ count: 1 }));
const optionAggregate = mock(() =>
  Promise.resolve({ _max: { displayOrder: 1 } }),
);
const optionCreate = mock(() => Promise.resolve({ id: "o-new" }));
const optionFindFirst = mock(
  () => Promise.resolve({ id: "o1" }) as Promise<unknown>,
);

mock.module("@/lib/db", () => ({
  db: {
    game: {
      findFirst: mock(() => Promise.resolve({ id: "g1" })),
      updateMany: gameUpdateMany,
      create: mock(() => Promise.resolve({ id: "g1" })),
    },
    gameQuestion: {
      findFirst: questionFindFirst,
      aggregate: questionAggregate,
      create: questionCreate,
      updateMany: questionUpdateMany,
    },
    gameOption: {
      findFirst: optionFindFirst,
      aggregate: optionAggregate,
      create: optionCreate,
    },
    weddingAdmin: { findFirst: mock(() => Promise.resolve(null)) },
  },
}));

const actions = await import("@/app/[slug]/admin/game/actions");

describe("admin game actions — lifecycle", () => {
  beforeEach(() => {
    gameUpdateMany.mockClear();
    questionCreate.mockClear();
    optionCreate.mockClear();
    questionUpdateMany.mockClear();
    mockCurrentUser.mockResolvedValue({
      id: "admin-1",
      primaryEmailAddressId: "e",
      emailAddresses: [
        {
          id: "e",
          emailAddress: "admin@example.com",
          verification: { status: "verified" },
        },
      ],
    });
    questionFindFirst.mockResolvedValue({ id: "g1" });
    optionFindFirst.mockResolvedValue({ id: "o1" });
  });

  it("starts the game (status → open)", async () => {
    const res = await actions.setGameStatus("g1", "open");
    expect(res.success).toBe(true);
    expect(gameUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "g1", weddingId: "w1" },
      data: { status: "open" },
    });
  });

  it("closes the game (status → closed)", async () => {
    const res = await actions.setGameStatus("g1", "closed");
    expect(res.success).toBe(true);
    expect(gameUpdateMany.mock.calls[0]?.[0]?.data).toMatchObject({
      status: "closed",
    });
  });

  it("adds a question at the next display order", async () => {
    const res = await actions.addQuestion("g1", "  Who snores? ");
    expect(res.success).toBe(true);
    expect(questionCreate.mock.calls[0]?.[0]?.data).toMatchObject({
      gameId: "g1",
      weddingId: "w1",
      prompt: "Who snores?",
      displayOrder: 3, // max (2) + 1
    });
  });

  it("adds an answer choice (option) to a question", async () => {
    const res = await actions.addOption("q1", "Helen");
    expect(res.success).toBe(true);
    expect(optionCreate.mock.calls[0]?.[0]?.data).toMatchObject({
      questionId: "q1",
      weddingId: "w1",
      label: "Helen",
      displayOrder: 2,
    });
  });

  it("reveals a correct answer after verifying the option is on the question", async () => {
    const res = await actions.setCorrectOption("q1", "o1");
    expect(res.success).toBe(true);
    expect(optionFindFirst.mock.calls[0]?.[0]?.where).toMatchObject({
      id: "o1",
      questionId: "q1",
      weddingId: "w1",
    });
    expect(questionUpdateMany.mock.calls[0]?.[0]?.data).toMatchObject({
      correctOptionId: "o1",
    });
  });

  it("rejects an option that isn't on the question", async () => {
    optionFindFirst.mockResolvedValue(null);
    const res = await actions.setCorrectOption("q1", "foreign");
    expect(res.success).toBe(false);
    expect(questionUpdateMany).not.toHaveBeenCalled();
  });

  it("refuses to act when not an admin", async () => {
    // mockResolvedValueOnce (not …Value) so this file never leaves the
    // process-global @clerk mock resolving to null — sibling admin tests
    // (e.g. gifts) inherit currentUser and would fail auth otherwise.
    mockCurrentUser.mockResolvedValueOnce(null);
    const res = await actions.setGameStatus("g1", "open");
    expect(res.success).toBe(false);
    expect(gameUpdateMany).not.toHaveBeenCalled();
  });
});
