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
import { Textarea } from "@workspace/ui/components/textarea";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing-components";
import {
  type Activity,
  createActivity,
  deleteActivity,
  updateActivity,
} from "./actions";

interface ActivityForm {
  name: string;
  description: string;
  link: string;
  address: string;
  emoji: string;
  imageUrl: string;
}

const emptyForm: ActivityForm = {
  name: "",
  description: "",
  link: "",
  address: "",
  emoji: "",
  imageUrl: "",
};

export function ThingsToDoManager({
  initialItems,
}: {
  initialItems: Activity[];
}) {
  const [items, setItems] = useState(initialItems);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(item: Activity) {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      link: item.link ?? "",
      address: item.address ?? "",
      emoji: item.emoji ?? "",
      imageUrl: item.imageUrl ?? "",
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSaving(true);
    try {
      if (editId) {
        const result = await updateActivity(editId, form);
        if (result.success) {
          setItems((prev) =>
            prev.map((a) =>
              a.id === editId
                ? {
                    ...a,
                    name: form.name,
                    description: form.description || null,
                    link: form.link || null,
                    address: form.address || null,
                    emoji: form.emoji || null,
                    imageUrl: form.imageUrl || null,
                  }
                : a,
            ),
          );
          toast.success("Activity updated");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to update");
        }
      } else {
        const result = await createActivity(form);
        if (result.success && result.item) {
          setItems((prev) => [...prev, result.item as Activity]);
          toast.success("Activity added");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to create");
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: Activity) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`))
      return;
    const result = await deleteActivity(item.id);
    if (result.success) {
      setItems((prev) => prev.filter((a) => a.id !== item.id));
      toast.success("Activity deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Things to Do</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activities and attractions to recommend to guests visiting your
            wedding city.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No activities yet</p>
          <p className="text-sm mt-1">
            Add your first thing-to-do recommendation to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-lg overflow-hidden bg-card flex flex-col"
            >
              {item.imageUrl && (
                // biome-ignore lint/performance/noImgElement: dynamic CDN URL
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {item.emoji && <span className="text-xl">{item.emoji}</span>}
                  <h3 className="font-medium">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                    className="gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Activity" : "Add Activity"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <Label htmlFor="activity-emoji">Emoji</Label>
                <Input
                  id="activity-emoji"
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  placeholder="☕"
                  className="mt-1 text-center"
                />
              </div>
              <div>
                <Label htmlFor="activity-name">Name *</Label>
                <Input
                  id="activity-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Pike Place Market"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Iconic public market with food stalls, flower vendors, and famous fish throwers."
                className="mt-1 min-h-20"
              />
            </div>
            <div>
              <Label htmlFor="activity-address">Address</Label>
              <Input
                id="activity-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="85 Pike St, Seattle, WA"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="activity-link">Website / link</Label>
              <Input
                id="activity-link"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://pikeplacemarket.org"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Image</Label>
              <div className="mt-1 flex items-start gap-3">
                {form.imageUrl && (
                  // biome-ignore lint/performance/noImgElement: dynamic CDN URL
                  <img
                    src={form.imageUrl}
                    alt="Activity"
                    className="w-24 h-24 rounded-md object-cover border border-border"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <UploadButton
                    endpoint="photoUploader"
                    onClientUploadComplete={(res) => {
                      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
                      if (url) {
                        setForm((f) => ({ ...f, imageUrl: url }));
                        toast.success("Image uploaded");
                      }
                    }}
                    onUploadError={(err: Error) => {
                      toast.error(`Upload failed: ${err.message}`);
                    }}
                    appearance={{
                      button:
                        "ut-ready:bg-muted ut-ready:text-foreground ut-uploading:bg-muted text-xs h-8 px-3 rounded-md border border-border",
                      allowedContent: "hidden",
                    }}
                    content={{
                      button: (
                        <span className="flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          {form.imageUrl ? "Replace" : "Upload"}
                        </span>
                      ),
                    }}
                  />
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="text-xs text-muted-foreground hover:text-destructive text-left"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
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
              {isSaving
                ? "Saving..."
                : editId
                  ? "Save changes"
                  : "Add activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
