import { Skeleton } from "@workspace/ui/components/skeleton";
import { Suspense } from "react";
import { getTodos } from "./actions";
import { TodoList } from "./todo-list";

export const dynamic = "force-dynamic";

function TodosSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function TodosContent() {
  const todos = await getTodos();
  return <TodoList initialTodos={todos} />;
}

export default function AdminTodosPage() {
  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-2xl mx-auto">
        <Suspense fallback={<TodosSkeleton />}>
          <TodosContent />
        </Suspense>
      </div>
    </div>
  );
}
