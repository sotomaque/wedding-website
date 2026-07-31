"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Play-time question shape — deliberately WITHOUT correctOptionId. This is a
 * client component, so its props are serialized into the page's RSC payload;
 * shipping the revealed answers here would let any open-game player read them
 * from the page source and cheat. The results view resolves correctness
 * server-side instead.
 */
interface PlayQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
}

interface GamePlayProps {
  token: string;
  coupleName: string;
  questions: PlayQuestion[];
  initialName: string;
  initialAnswers: { questionId: string; optionId: string }[];
  /** True if this device already has a saved submission. */
  alreadyPlayed: boolean;
}

export function GamePlay({
  token,
  coupleName,
  questions,
  initialName,
  initialAnswers,
  alreadyPlayed,
}: GamePlayProps) {
  const [name, setName] = useState(initialName);
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialAnswers.map((a) => [a.questionId, a.optionId])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadyPlayed);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((q) => picks[q.id]).length,
    [questions, picks],
  );
  const canSubmit = name.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/game/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          answers: Object.entries(picks).map(([questionId, optionId]) => ({
            questionId,
            optionId,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Couldn't save your guesses");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center border rounded-xl bg-card p-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">Your guesses are in!</h2>
        <p className="text-muted-foreground mt-2">
          Thanks for playing, {name.trim() || "friend"}. {coupleName} will
          reveal the answers after the wedding — come back to this link to see
          if you won.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 text-sm text-primary underline underline-offset-2"
        >
          Change my answers
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="game-name" className="block text-sm font-medium mb-1">
          Your name
        </label>
        <input
          id="game-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          className="w-full max-w-sm rounded-lg border px-3 py-2.5 bg-background focus:outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="border rounded-xl bg-card p-5">
            <p className="font-medium mb-3">
              <span className="text-muted-foreground mr-2">{i + 1}.</span>
              {q.prompt}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((o) => {
                const selected = picks[q.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setPicks((prev) => ({ ...prev, [q.id]: o.id }))
                    }
                    className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors text-left ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:border-primary"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Tip: if two people get the same number right, whoever{" "}
        <span className="font-medium">submitted first</span> wins — so lock in
        your guesses early!
      </p>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <div className="sticky bottom-0 mt-6 py-4 bg-background/90 backdrop-blur border-t">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={`py-2.5 px-6 rounded-lg font-medium transition-colors ${
              canSubmit
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {submitting ? "Saving…" : "Submit my guesses"}
          </button>
        </div>
      </div>
    </div>
  );
}
