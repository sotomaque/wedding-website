"use client";

import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, Circle, ListChecks, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { OnboardingChecklistState } from "@/lib/onboarding-checklist";
import { dismissOnboardingChecklist } from "./checklist-actions";

export function OnboardingChecklist({
  state,
}: {
  state: OnboardingChecklistState;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const { items, doneCount, total, allDone } = state;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  function handleDismiss() {
    setHidden(true); // optimistic
    startTransition(async () => {
      const res = await dismissOnboardingChecklist();
      if (res.success) {
        router.refresh();
      } else {
        setHidden(false);
        toast.error(res.error ?? "Failed to dismiss");
      }
    });
  }

  return (
    <div className="p-6 bg-secondary rounded-lg mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <ListChecks className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground">
              {allDone
                ? "Your site is ready to share 🎉"
                : "Get your site ready"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {doneCount} of {total} done
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleDismiss}
          disabled={isPending}
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-1.5 w-full rounded-full bg-background overflow-hidden mb-4">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone ? (
        <p className="text-sm text-muted-foreground">
          Everything's set — you can keep editing anytime. Dismiss this when
          you're done with it.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) =>
            item.done ? (
              <li
                key={item.id}
                className="flex items-center gap-2.5 px-2 py-1.5 text-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-muted-foreground line-through">
                  {item.label}
                </span>
              </li>
            ) : (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-background transition-colors"
                >
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
