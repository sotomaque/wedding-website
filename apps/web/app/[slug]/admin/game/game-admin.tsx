"use client";

import { Button } from "@workspace/ui/components/button";
import { Check, Trash2, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  addOption,
  addQuestion,
  deleteOption,
  deleteQuestion,
  setCorrectOption,
  setGameStatus,
  updateGameMeta,
  updateOption,
  updateQuestion,
} from "./actions";

interface OptionView {
  id: string;
  label: string;
}
interface QuestionView {
  id: string;
  prompt: string;
  correctOptionId: string | null;
  options: OptionView[];
}
interface GameView {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed";
  publicToken: string | null;
  questions: QuestionView[];
  playerCount: number;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  correct: number;
  rank: number;
  isWinner: boolean;
}

const STATUS_LABELS: Record<GameView["status"], string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export function GameAdmin({
  game,
  publicUrl,
  leaderboard,
  revealedCount,
}: {
  game: GameView;
  publicUrl: string | null;
  leaderboard: LeaderboardRow[];
  revealedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description ?? "");
  const [newQuestion, setNewQuestion] = useState("");

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error || "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Meta + status */}
      <div className="border rounded-xl bg-card p-5 space-y-4">
        <div>
          <label htmlFor="g-title" className="block text-sm font-medium mb-1">
            Game title
          </label>
          <input
            id="g-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== game.title)
                run(() => updateGameMeta(game.id, { title }));
            }}
            className="w-full rounded-lg border px-3 py-2 bg-background"
          />
        </div>
        <div>
          <label htmlFor="g-desc" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="g-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (game.description ?? ""))
                run(() => updateGameMeta(game.id, { description }));
            }}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 bg-background"
          />
        </div>

        {/* Primary lifecycle action — start / end the game */}
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          {game.status === "open" ? (
            <ConfirmDialog
              trigger={
                <Button disabled={pending}>End game &amp; reveal</Button>
              }
              title="End the game and reveal results?"
              description="Guests will see everyone's answers, any correct answers you've marked, and the winner. You can re-open it afterward if you need to."
              confirmLabel="End &amp; reveal"
              variant="default"
              onConfirm={() => run(() => setGameStatus(game.id, "closed"))}
            />
          ) : (
            <Button
              disabled={pending || game.questions.length === 0}
              onClick={() => run(() => setGameStatus(game.id, "open"))}
            >
              {game.status === "closed" ? "Re-open game" : "Start game"}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {game.status === "draft" &&
              "Draft — not shared yet. Start it when your questions are ready."}
            {game.status === "open" && "Live — guests can play via the link."}
            {game.status === "closed" &&
              "Closed — results and the winner are shown to guests."}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-1">Set status:</span>
          {(["draft", "open", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => run(() => setGameStatus(game.id, s))}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                game.status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:border-primary"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {publicUrl && (
          <div className="flex flex-wrap items-center gap-3 text-sm pt-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(publicUrl);
                toast.success("Share link copied");
              }}
              className="text-primary underline underline-offset-2"
            >
              Copy share link
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {game.status === "closed" ? "View results" : "Preview / play"}
            </a>
            <span className="text-muted-foreground">
              {game.playerCount} player{game.playerCount === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Questions ({game.questions.length})
        </h2>

        {game.questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            index={i}
            question={q}
            disabled={pending}
            run={run}
          />
        ))}

        {/* Add question */}
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="New question, e.g. Who is more likely to…"
            className="flex-1 rounded-lg border px-3 py-2 bg-background"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newQuestion.trim()) {
                run(() => addQuestion(game.id, newQuestion));
                setNewQuestion("");
              }
            }}
          />
          <Button
            disabled={pending || !newQuestion.trim()}
            onClick={() => {
              run(() => addQuestion(game.id, newQuestion));
              setNewQuestion("");
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {/* In-admin responses / leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Responses ({game.playerCount})
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            {revealedCount === 0
              ? "No answers revealed yet — mark correct answers above to score guesses."
              : `Scored on ${revealedCount} revealed answer${
                  revealedCount === 1 ? "" : "s"
                }.`}
          </p>
          <div className="border rounded-xl bg-card divide-y">
            {leaderboard.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums w-6">
                    #{r.rank}
                  </span>
                  <span className={r.isWinner ? "font-semibold" : ""}>
                    {r.name}
                  </span>
                  {r.isWinner && <Trophy className="w-4 h-4 text-amber-500" />}
                </span>
                <span className="text-sm tabular-nums">{r.correct}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  index,
  question,
  disabled,
  run,
}: {
  index: number;
  question: QuestionView;
  disabled: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>) => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [newOption, setNewOption] = useState("");

  return (
    <div className="border rounded-xl bg-card p-4">
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground pt-2">{index + 1}.</span>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => {
            if (prompt.trim() && prompt !== question.prompt)
              run(() => updateQuestion(question.id, prompt));
          }}
          className="flex-1 rounded-lg border px-3 py-2 bg-background font-medium"
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" disabled={disabled}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          }
          title="Delete this question?"
          description="This removes the question, its options, and any answers guests gave for it."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => run(() => deleteQuestion(question.id))}
        />
      </div>

      <div className="mt-3 pl-6 space-y-2">
        {question.options.map((o) => {
          const isCorrect = question.correctOptionId === o.id;
          return (
            <OptionRow
              key={o.id}
              option={o}
              isCorrect={isCorrect}
              disabled={disabled}
              onToggleCorrect={() =>
                run(() =>
                  setCorrectOption(question.id, isCorrect ? null : o.id),
                )
              }
              onRename={(label) => run(() => updateOption(o.id, label))}
              onDelete={() => run(() => deleteOption(o.id))}
            />
          );
        })}

        {question.options.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add at least two options for guests to choose from.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Add an option (e.g. Helen)"
            className="flex-1 rounded-lg border px-3 py-1.5 bg-background text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newOption.trim()) {
                run(() => addOption(question.id, newOption));
                setNewOption("");
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !newOption.trim()}
            onClick={() => {
              run(() => addOption(question.id, newOption));
              setNewOption("");
            }}
          >
            Add option
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {question.correctOptionId
            ? "Answer revealed. Click the ✓ again to un-reveal."
            : "Click ✓ next to the right answer to reveal it (now or after the wedding)."}
        </p>
      </div>
    </div>
  );
}

function OptionRow({
  option,
  isCorrect,
  disabled,
  onToggleCorrect,
  onRename,
  onDelete,
}: {
  option: OptionView;
  isCorrect: boolean;
  disabled: boolean;
  onToggleCorrect: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(option.label);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleCorrect}
        aria-label={isCorrect ? "Un-reveal answer" : "Mark as correct answer"}
        className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center ${
          isCorrect
            ? "bg-green-500 border-green-500 text-white"
            : "hover:border-green-400 text-transparent"
        }`}
      >
        <Check className="w-4 h-4" />
      </button>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label.trim() && label !== option.label) onRename(label);
        }}
        className="flex-1 rounded-lg border px-3 py-1.5 bg-background text-sm"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        aria-label="Delete option"
        className="text-muted-foreground hover:text-red-500 p-1"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
