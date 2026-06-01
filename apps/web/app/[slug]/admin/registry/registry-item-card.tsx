"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { RegistryItem } from "./actions";

interface RegistryItemCardProps {
  item: RegistryItem;
  index: number;
  total: number;
  isPending: boolean;
  onEdit: (item: RegistryItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onReleaseClaim: (id: string) => void;
}

export function RegistryItemCard({
  item,
  index,
  total,
  isPending,
  onEdit,
  onDelete,
  onToggleActive,
  onMove,
  onReleaseClaim,
}: RegistryItemCardProps) {
  const isProduct = item.itemType === "product";
  const isClaimed = isProduct && !!item.claimedAt;
  const link = isProduct ? item.productUrl : item.stripeUrl;

  return (
    <div className="relative border rounded-lg p-4 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {item.emoji && (
            <span className="text-2xl shrink-0">{item.emoji}</span>
          )}
          <h3 className="font-medium truncate">{item.title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline">{isProduct ? "Gift" : "Fund"}</Badge>
          <Badge variant={item.isActive ? "default" : "secondary"}>
            {item.isActive ? "Active" : "Hidden"}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Claim status (products only) */}
      {isProduct && (
        <div className="text-xs">
          {isClaimed ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5">
              <span className="text-amber-800 dark:text-amber-200 truncate">
                Claimed by {item.claimedByName}
                {item.claimedByEmail ? ` (${item.claimedByEmail})` : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs shrink-0"
                onClick={() => onReleaseClaim(item.id)}
                disabled={isPending}
              >
                Release
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">Available to claim</span>
          )}
        </div>
      )}

      {/* External link */}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {isProduct ? "Product link" : "Payment link"}
        </a>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(index, "up")}
            disabled={index === 0 || isPending}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(index, "down")}
            disabled={index === total - 1 || isPending}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Switch
            checked={item.isActive}
            onCheckedChange={(checked) => onToggleActive(item.id, checked)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Edit ${item.title}`}
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label={`Delete ${item.title}`}
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
