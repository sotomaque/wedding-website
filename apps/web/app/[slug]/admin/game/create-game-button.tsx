"use client";

import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createGame } from "./actions";

export function CreateGameButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="border rounded-xl bg-card p-8 text-center">
      <p className="text-muted-foreground mb-4">
        No game yet. Create one to start adding questions.
      </p>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await createGame();
            if (!res.success) {
              toast.error(res.error || "Failed to create game");
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? "Creating…" : "Create the game"}
      </Button>
    </div>
  );
}
