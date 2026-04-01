"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createRegistryItem,
  deleteRegistryItem,
  type RegistryItem,
  reorderRegistryItems,
  toggleRegistryItemActive,
  updateRegistryItem,
} from "./actions";

interface RegistryManagerProps {
  initialItems: RegistryItem[];
}

interface ItemForm {
  title: string;
  description: string;
  emoji: string;
  imageUrl: string;
  stripeUrl: string;
  isActive: boolean;
}

const emptyForm: ItemForm = {
  title: "",
  description: "",
  emoji: "",
  imageUrl: "",
  stripeUrl: "",
  isActive: true,
};

export function RegistryManager({ initialItems }: RegistryManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      stripeUrl: item.stripeUrl || "",
      isActive: item.isActive,
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        const result = await updateRegistryItem(editId, form);
        if (result.success) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === editId ? { ...item, ...form } : item,
            ),
          );
          toast.success("Registry item updated");
        } else {
          toast.error(result.error ?? "Failed to update");
        }
      } else {
        const result = await createRegistryItem(form);
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
        setItems(items); // revert
        toast.error("Failed to reorder");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Registry Items</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your gift registry. Items appear on your public registry
            page.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
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
            <div
              key={item.id}
              className="relative border rounded-lg p-4 space-y-3 bg-card"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {item.emoji && (
                    <span className="text-2xl shrink-0">{item.emoji}</span>
                  )}
                  <h3 className="font-medium truncate">{item.title}</h3>
                </div>
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? "Active" : "Hidden"}
                </Badge>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Stripe URL */}
              {item.stripeUrl && (
                <a
                  href={item.stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Payment link
                </a>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0 || isPending}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === items.length - 1 || isPending}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={item.isActive}
                    onCheckedChange={(checked) =>
                      handleToggleActive(item.id, checked)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Registry Item" : "Add Registry Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Honeymoon Fund"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="A brief description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={form.emoji}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emoji: e.target.value }))
                  }
                  placeholder="e.g. 🏝️"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripeUrl">Stripe Payment Link</Label>
              <Input
                id="stripeUrl"
                value={form.stripeUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stripeUrl: e.target.value }))
                }
                placeholder="https://buy.stripe.com/..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Visible on public page</Label>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
