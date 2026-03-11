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

// Create db mock with tracking
const mockExecute = mock(() => Promise.resolve([]));
const mockExecuteTakeFirst = mock(() => Promise.resolve(null));

const sampleTodos = [
  {
    id: "todo-1",
    title: "Book the florist",
    is_completed: false,
    display_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "todo-2",
    title: "Send invitations",
    is_completed: false,
    display_order: 2,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "todo-3",
    title: "Finalize menu",
    is_completed: true,
    display_order: 3,
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
];

// Build a chainable mock that supports the query patterns used by the actions
function createChainableMock(terminal: ReturnType<typeof mock>) {
  const chain: Record<string, () => Record<string, unknown>> = {};
  const self = () => chain;
  chain.selectAll = self;
  chain.select = self;
  chain.orderBy = self;
  chain.where = self;
  chain.set = self;
  chain.values = self;
  chain.execute = terminal as unknown as () => Record<string, unknown>;
  chain.executeTakeFirst = mockExecuteTakeFirst as unknown as () => Record<
    string,
    unknown
  >;
  return chain;
}

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () => createChainableMock(mockExecute),
    insertInto: () => createChainableMock(mockExecute),
    updateTable: () => createChainableMock(mockExecute),
    deleteFrom: () => createChainableMock(mockExecute),
    fn: {
      max: () => ({
        as: () => "max_order",
      }),
    },
  },
}));

describe("Admin Todos - getTodos", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockExecute.mockResolvedValue(sampleTodos);
  });

  it("should return all todos", async () => {
    const { getTodos } = await import("@/app/admin/todos/actions");

    const todos = await getTodos();

    expect(todos).toHaveLength(3);
    expect(todos[0]?.id).toBe("todo-1");
  });

  it("should return todos with all required fields", async () => {
    const { getTodos } = await import("@/app/admin/todos/actions");

    const todos = await getTodos();

    for (const todo of todos) {
      expect(todo.id).toBeDefined();
      expect(todo.title).toBeDefined();
      expect(typeof todo.is_completed).toBe("boolean");
      expect(typeof todo.display_order).toBe("number");
      expect(todo.created_at).toBeDefined();
      expect(todo.updated_at).toBeDefined();
    }
  });

  it("should throw on database error", async () => {
    mockExecute.mockRejectedValue(new Error("Database error"));

    const { getTodos } = await import("@/app/admin/todos/actions");

    await expect(getTodos()).rejects.toThrow("Database error");
  });
});

describe("Admin Todos - addTodo", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockExecute.mockResolvedValue([]);
    mockExecuteTakeFirst.mockResolvedValue({ max_order: 3 });
  });

  it("should add a todo successfully", async () => {
    const { addTodo } = await import("@/app/admin/todos/actions");

    const result = await addTodo("Order wedding cake");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject empty titles", async () => {
    const { addTodo } = await import("@/app/admin/todos/actions");

    const result = await addTodo("");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should reject whitespace-only titles", async () => {
    const { addTodo } = await import("@/app/admin/todos/actions");

    const result = await addTodo("   ");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should return error on database failure", async () => {
    mockExecute.mockRejectedValue(new Error("DB error"));

    const { addTodo } = await import("@/app/admin/todos/actions");

    const result = await addTodo("Some task");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to add todo");
  });
});

describe("Admin Todos - toggleTodo", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecute.mockResolvedValue([]);
  });

  it("should toggle a todo to completed", async () => {
    const { toggleTodo } = await import("@/app/admin/todos/actions");

    const result = await toggleTodo("todo-1", true);

    expect(result.success).toBe(true);
  });

  it("should toggle a todo to incomplete", async () => {
    const { toggleTodo } = await import("@/app/admin/todos/actions");

    const result = await toggleTodo("todo-3", false);

    expect(result.success).toBe(true);
  });

  it("should return error on database failure", async () => {
    mockExecute.mockRejectedValue(new Error("DB error"));

    const { toggleTodo } = await import("@/app/admin/todos/actions");

    const result = await toggleTodo("todo-1", true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update todo");
  });
});

describe("Admin Todos - deleteTodo", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecute.mockResolvedValue([]);
  });

  it("should delete a todo successfully", async () => {
    const { deleteTodo } = await import("@/app/admin/todos/actions");

    const result = await deleteTodo("todo-1");

    expect(result.success).toBe(true);
  });

  it("should return error on database failure", async () => {
    mockExecute.mockRejectedValue(new Error("DB error"));

    const { deleteTodo } = await import("@/app/admin/todos/actions");

    const result = await deleteTodo("todo-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to delete todo");
  });
});

describe("Admin Todos - updateTodoTitle", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecute.mockResolvedValue([]);
  });

  it("should update a todo title successfully", async () => {
    const { updateTodoTitle } = await import("@/app/admin/todos/actions");

    const result = await updateTodoTitle("todo-1", "Updated title");

    expect(result.success).toBe(true);
  });

  it("should reject empty titles", async () => {
    const { updateTodoTitle } = await import("@/app/admin/todos/actions");

    const result = await updateTodoTitle("todo-1", "");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should reject whitespace-only titles", async () => {
    const { updateTodoTitle } = await import("@/app/admin/todos/actions");

    const result = await updateTodoTitle("todo-1", "   ");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title is required");
  });

  it("should return error on database failure", async () => {
    mockExecute.mockRejectedValue(new Error("DB error"));

    const { updateTodoTitle } = await import("@/app/admin/todos/actions");

    const result = await updateTodoTitle("todo-1", "New title");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update todo");
  });
});

describe("Admin Todos - Data Shape", () => {
  it("should have valid completion states", () => {
    const incomplete = sampleTodos.filter((t) => !t.is_completed);
    const completed = sampleTodos.filter((t) => t.is_completed);

    expect(incomplete).toHaveLength(2);
    expect(completed).toHaveLength(1);
  });

  it("should have sequential display_order values", () => {
    const orders = sampleTodos.map((t) => t.display_order);
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
