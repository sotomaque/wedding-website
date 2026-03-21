"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  addTodo,
  deleteTodo,
  toggleTodo,
  updateTodoTitle,
  type WeddingTodo,
} from "./actions";

export function TodoList({ initialTodos }: { initialTodos: WeddingTodo[] }) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const pendingTodos = initialTodos.filter((t) => !t.is_completed);
  const completedTodos = initialTodos.filter((t) => t.is_completed);

  function handleAdd() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await addTodo(newTitle);
      setNewTitle("");
    });
  }

  function handleToggle(id: string, currentValue: boolean) {
    startTransition(async () => {
      await toggleTodo(id, !currentValue);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTodo(id);
    });
  }

  function handleStartEdit(todo: WeddingTodo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  function handleSaveEdit(id: string) {
    if (!editingTitle.trim()) return;
    startTransition(async () => {
      await updateTodoTitle(id, editingTitle);
      setEditingId(null);
      setEditingTitle("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-serif">
          Wedding To-Do List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new todo */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Add a new task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !newTitle.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </form>

        {/* Pending todos */}
        {pendingTodos.length === 0 && completedTodos.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No tasks yet. Add your first wedding to-do above!
          </p>
        )}

        {pendingTodos.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              To Do ({pendingTodos.length})
            </h3>
            <ul className="space-y-1">
              {pendingTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isPending={isPending}
                  isEditing={editingId === todo.id}
                  editingTitle={editingTitle}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditingTitleChange={setEditingTitle}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Completed todos */}
        {completedTodos.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Completed ({completedTodos.length})
            </h3>
            <ul className="space-y-1">
              {completedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isPending={isPending}
                  isEditing={editingId === todo.id}
                  editingTitle={editingTitle}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onEditingTitleChange={setEditingTitle}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodoItem({
  todo,
  isPending,
  isEditing,
  editingTitle,
  onToggle,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditingTitleChange,
}: {
  todo: WeddingTodo;
  isPending: boolean;
  isEditing: boolean;
  editingTitle: string;
  onToggle: (id: string, currentValue: boolean) => void;
  onDelete: (id: string) => void;
  onStartEdit: (todo: WeddingTodo) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditingTitleChange: (value: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md border border-border px-3 py-2 group hover:bg-secondary/30 transition-colors">
      <Checkbox
        checked={todo.is_completed}
        onCheckedChange={() => onToggle(todo.id, todo.is_completed)}
        disabled={isPending}
        aria-label={`Mark "${todo.title}" as ${todo.is_completed ? "incomplete" : "complete"}`}
      />

      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveEdit(todo.id);
          }}
          className="flex-1 flex items-center gap-2"
        >
          <Input
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isPending || !editingTitle.trim()}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCancelEdit}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : (
        <>
          <span
            className={cn(
              "flex-1 text-sm",
              todo.is_completed && "line-through text-muted-foreground",
            )}
          >
            {todo.title}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onStartEdit(todo)}
              disabled={isPending}
              aria-label={`Edit "${todo.title}"`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(todo.id)}
              disabled={isPending}
              aria-label={`Delete "${todo.title}"`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}
