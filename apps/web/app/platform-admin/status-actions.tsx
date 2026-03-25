"use client";

import { Button } from "@workspace/ui/components/button";
import { useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteWedding, updateWeddingStatus } from "./actions";

export function StatusActions({
  weddingId,
  currentStatus,
  coupleName,
}: {
  weddingId: string;
  currentStatus: string;
  coupleName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateWeddingStatus(weddingId, status);
    });
  }

  return (
    <div className="flex items-center gap-1">
      {currentStatus !== "published" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          disabled={isPending}
          onClick={() => handleStatusChange("published")}
        >
          Publish
        </Button>
      )}
      {currentStatus !== "archived" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          disabled={isPending}
          onClick={() => handleStatusChange("archived")}
        >
          Archive
        </Button>
      )}
      {currentStatus !== "draft" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          disabled={isPending}
          onClick={() => handleStatusChange("draft")}
        >
          Draft
        </Button>
      )}
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-destructive hover:text-destructive"
            disabled={isPending}
          >
            Delete
          </Button>
        }
        title="Delete Wedding"
        description={`Are you sure you want to permanently delete "${coupleName}"? This will remove all guests, events, and related data. This cannot be undone.`}
        confirmLabel="Delete Wedding"
        variant="destructive"
        onConfirm={() => {
          startTransition(async () => {
            await deleteWedding(weddingId);
          });
        }}
      />
    </div>
  );
}
