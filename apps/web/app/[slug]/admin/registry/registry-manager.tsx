"use client";

import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createRegistryItem,
  deleteRegistryItem,
  type RegistryItem,
  releaseRegistryClaim,
  reorderRegistryItems,
  toggleRegistryItemActive,
  updateRegistryItem,
} from "./actions";
import { RegistryItemCard } from "./registry-item-card";
import {
  emptyForm,
  type ItemForm,
  RegistryItemDialog,
} from "./registry-item-dialog";

interface RegistryManagerProps {
  initialItems: RegistryItem[];
}

export function RegistryManager({ initialItems }: RegistryManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(item: RegistryItem) {
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      emoji: item.emoji || "",
      imageUrl: item.imageUrl || "",
      itemType: item.itemType,
      stripeUrl: item.stripeUrl || "",
      productUrl: item.productUrl || "",
      price: item.priceCents != null ? (item.priceCents / 100).toString() : "",
      isActive: item.isActive,
    });
    setShowDialog(true);
  }

  // Map the dialog form (price as a dollar string) to the server action input
  // (priceCents). Returns undefined cents for blank/invalid prices.
  function formToInput() {
    const dollars = Number.parseFloat(form.price);
    const priceCents =
      form.itemType === "product" && form.price.trim() && !Number.isNaN(dollars)
        ? Math.round(dollars * 100)
        : null;
    return {
      title: form.title,
      description: form.description,
      emoji: form.emoji,
      imageUrl: form.imageUrl,
      itemType: form.itemType,
      stripeUrl: form.stripeUrl,
      productUrl: form.productUrl,
      priceCents,
      isActive: form.isActive,
    };
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        const input = formToInput();
        const result = await updateRegistryItem(editId, input);
        if (result.success) {
          // Optimistically reflect the edit immediately, then refresh from the
          // server to reconcile derived fields (cleared links on type switch).
          setItems((prev) =>
            prev.map((item) =>
              item.id === editId
                ? {
                    ...item,
                    title: input.title.trim(),
                    description: input.description.trim() || null,
                    emoji: input.emoji.trim() || null,
                    imageUrl: input.imageUrl.trim() || null,
                    itemType: input.itemType,
                    stripeUrl:
                      input.itemType === "fund"
                        ? input.stripeUrl.trim() || null
                        : null,
                    productUrl:
                      input.itemType === "product"
                        ? input.productUrl.trim() || null
                        : null,
                    priceCents:
                      input.itemType === "product" ? input.priceCents : null,
                    isActive: input.isActive,
                  }
                : item,
            ),
          );
          router.refresh();
          toast.success("Registry item updated");
        } else {
          toast.error(result.error ?? "Failed to update");
        }
      } else {
        const result = await createRegistryItem(formToInput());
        if (result.success && result.item) {
          const newItem = result.item;
          setItems((prev) => [...prev, newItem]);
          toast.success("Registry item created");
        } else {
          toast.error(result.error ?? "Failed to create");
        }
      }
      setShowDialog(false);
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`))
      return;

    const result = await deleteRegistryItem(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Registry item deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    const result = await toggleRegistryItemActive(id, isActive);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive } : item)),
      );
    } else {
      toast.error(result.error ?? "Failed to toggle");
    }
  }

  async function handleReleaseClaim(id: string) {
    const item = items.find((i) => i.id === id);
    if (
      item &&
      !window.confirm(
        `Release the claim on "${item.title}"? It will become available again.`,
      )
    )
      return;

    const result = await releaseRegistryClaim(id);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                claimedByName: null,
                claimedByEmail: null,
                claimedAt: null,
              }
            : i,
        ),
      );
      toast.success("Claim released");
    } else {
      toast.error(result.error ?? "Failed to release claim");
    }
  }

  function handleMove(index: number, direction: "up" | "down") {
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;

    const a = newItems[index];
    const b = newItems[swapIndex];
    if (!a || !b) return;
    newItems[index] = b;
    newItems[swapIndex] = a;
    setItems(newItems);

    startTransition(async () => {
      const result = await reorderRegistryItems(newItems.map((i) => i.id));
      if (!result.success) {
        setItems(items);
        toast.error("Failed to reorder");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Registry Items</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your gift registry. Items appear on your public registry
            page.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No registry items yet</p>
          <p className="text-sm mt-1">Add your first item to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <RegistryItemCard
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              isPending={isPending}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onMove={handleMove}
              onReleaseClaim={handleReleaseClaim}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <RegistryItemDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        form={form}
        onFormChange={setForm}
        onSave={handleSave}
        isSaving={isSaving}
        isEdit={editId !== null}
      />
    </div>
  );
}
