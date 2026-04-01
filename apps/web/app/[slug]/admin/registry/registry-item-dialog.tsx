"use client";

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

export interface ItemForm {
  title: string;
  description: string;
  emoji: string;
  imageUrl: string;
  stripeUrl: string;
  isActive: boolean;
}

export const emptyForm: ItemForm = {
  title: "",
  description: "",
  emoji: "",
  imageUrl: "",
  stripeUrl: "",
  isActive: true,
};

interface RegistryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ItemForm;
  onFormChange: (form: ItemForm) => void;
  onSave: () => void;
  isSaving: boolean;
  isEdit: boolean;
}

export function RegistryItemDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  isSaving,
  isEdit,
}: RegistryItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Registry Item" : "Add Registry Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="e.g. Honeymoon Fund"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                onFormChange({ ...form, description: e.target.value })
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
                  onFormChange({ ...form, emoji: e.target.value })
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
                  onFormChange({ ...form, imageUrl: e.target.value })
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
                onFormChange({ ...form, stripeUrl: e.target.value })
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
                onFormChange({ ...form, isActive: checked })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
