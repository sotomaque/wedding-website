import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: mock(() => {}),
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    POSTGRES_URL: undefined,
    DATABASE_URL: "postgresql://test",
    ADMIN_EMAILS: "admin@example.com",
  },
}));

// Mock wedding context (must be before @/lib/db mock)
mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({
      weddingId: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      weddingDate: new Date("2026-07-30"),
      rsvpDeadline: "March 30th, 2026",
      timezone: "America/New_York",
      status: "published",
    }),
  ),
}));

// Create Prisma-style db mocks
const mockFindMany = mock(() => Promise.resolve([]));
const mockAggregate = mock(() =>
  Promise.resolve({ _max: { displayOrder: 0 } }),
);
const mockCreate = mock(() => Promise.resolve({}));
const mockUpdate = mock(() => Promise.resolve({}));
const mockDelete = mock(() => Promise.resolve({}));

const sampleTodos = [
  {
    id: "todo-1",
    title: "Book the florist",
    isCompleted: false,
    displayOrder: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "todo-2",
    title: "Send invitations",
    isCompleted: false,
    displayOrder: 2,
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "todo-3",
    title: "Finalize menu",
    isCompleted: true,
    displayOrder: 3,
    createdAt: "2026-01-03T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z",
  },
];

mock.module("@/lib/db", () => ({
  db: {
    weddingTodo: {
      findMany: mockFindMany,
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      count: mock(() => Promise.resolve(0)),
      aggregate: mockAggregate,
    },
  },
}));

describe("Admin Todos - getTodos", () => {
  beforeEach(() => {
    mockFindMany.mockClear();
    mockFindMany.mockResolvedValue(sampleTodos);
  });

  it("should return all todos", async () => {
    const { getTodos } = await import("@/app/[slug]/admin/todos/actions");

    const todos = await getTodos();

    expect(todos).toHaveLength(3);
    expect(todos[0]?.id).toBe("todo-1");
  });

  it("should return todos with all required fields", async () => {
    const { getTodos } = await import("@/app/[slug]/admin/todos/actions");

    const todos = await getTodos();

    for (const todo of todos) {
      expect(todo.id).toBeDefined();
      expect(todo.title).toBeDefined();
      expect(typeof todo.isCompleted).toBe("boolean");
      expect(typeof todo.displayOrder).toBe("number");
      expect(todo.createdAt).toBeDefined();
      expect(todo.updatedAt).toBeDefined();
    }
  });

  it("should throw on database error", async () => {
    mockFindMany.mockRejectedValue(new Error("Database error"));

    const { getTodos } = await import("@/app/[slug]/admin/todos/actions");

    await expect(getTodos()).rejects.toThrow("Database error");
  });
});

describe("Admin Todos - addTodo", () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockAggregate.mockClear();
    mockAggregate.mockResolvedValue({ _max: { displayOrder: 3 } });
    mockCreate.mockResolvedValue({});
  });

  it("should add a todo successfully", async () => {
    const { addTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await addTodo("Order wedding cake");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject empty titles", async () => {
    const { addTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await addTodo("");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should reject whitespace-only titles", async () => {
    const { addTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await addTodo("   ");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should return error on database failure", async () => {
    mockAggregate.mockRejectedValue(new Error("DB error"));

    const { addTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await addTodo("Some task");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to add todo");
  });
});

describe("Admin Todos - toggleTodo", () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockUpdate.mockResolvedValue({});
  });

  it("should toggle a todo to completed", async () => {
    const { toggleTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await toggleTodo("todo-1", true);

    expect(result.success).toBe(true);
  });

  it("should toggle a todo to incomplete", async () => {
    const { toggleTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await toggleTodo("todo-3", false);

    expect(result.success).toBe(true);
  });

  it("should return error on database failure", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error"));

    const { toggleTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await toggleTodo("todo-1", true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update todo");
  });
});

describe("Admin Todos - deleteTodo", () => {
  beforeEach(() => {
    mockDelete.mockClear();
    mockDelete.mockResolvedValue({});
  });

  it("should delete a todo successfully", async () => {
    const { deleteTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await deleteTodo("todo-1");

    expect(result.success).toBe(true);
  });

  it("should return error on database failure", async () => {
    mockDelete.mockRejectedValue(new Error("DB error"));

    const { deleteTodo } = await import("@/app/[slug]/admin/todos/actions");

    const result = await deleteTodo("todo-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to delete todo");
  });
});

describe("Admin Todos - updateTodoTitle", () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockUpdate.mockResolvedValue({});
  });

  it("should update a todo title successfully", async () => {
    const { updateTodoTitle } = await import(
      "@/app/[slug]/admin/todos/actions"
    );

    const result = await updateTodoTitle("todo-1", "Updated title");

    expect(result.success).toBe(true);
  });

  it("should reject empty titles", async () => {
    const { updateTodoTitle } = await import(
      "@/app/[slug]/admin/todos/actions"
    );

    const result = await updateTodoTitle("todo-1", "");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should reject whitespace-only titles", async () => {
    const { updateTodoTitle } = await import(
      "@/app/[slug]/admin/todos/actions"
    );

    const result = await updateTodoTitle("todo-1", "   ");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should return error on database failure", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error"));

    const { updateTodoTitle } = await import(
      "@/app/[slug]/admin/todos/actions"
    );

    const result = await updateTodoTitle("todo-1", "New title");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update todo");
  });
});

describe("Admin Todos - Data Shape", () => {
  it("should have valid completion states", () => {
    const incomplete = sampleTodos.filter((t) => !t.isCompleted);
    const completed = sampleTodos.filter((t) => t.isCompleted);

    expect(incomplete).toHaveLength(2);
    expect(completed).toHaveLength(1);
  });

  it("should have sequential displayOrder values", () => {
    const orders = sampleTodos.map((t) => t.displayOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]!);
    }
  });

  it("should have non-empty titles", () => {
    for (const todo of sampleTodos) {
      expect(todo.title.trim().length).toBeGreaterThan(0);
    }
  });
});
