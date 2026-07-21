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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type Activity,
  type ActivityInput,
  createActivity,
  deleteActivity,
  reorderActivities,
  updateActivity,
  type VenueType,
} from "./actions";
import { VENUE_TYPE_LABELS, VENUE_TYPES } from "./constants";

interface ActivityFormState {
  name: string;
  description: string;
  emoji: string;
  address: string;
  link: string;
  imageUrl: string;
  isVenue: boolean;
  venueType: VenueType | null;
}

const emptyForm: ActivityFormState = {
  name: "",
  description: "",
  emoji: "",
  address: "",
  link: "",
  imageUrl: "",
  isVenue: false,
  venueType: null,
};

function toInput(form: ActivityFormState): ActivityInput {
  return { ...form };
}

export function ActivitiesManager({
  initialActivities,
}: {
  initialActivities: Activity[];
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(activity: Activity) {
    setEditId(activity.id);
    setForm({
      name: activity.name,
      description: activity.description || "",
      emoji: activity.emoji || "",
      address: activity.address || "",
      link: activity.link || "",
      imageUrl: activity.imageUrl || "",
      isVenue: activity.isVenue ?? false,
      venueType: activity.venueType,
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
        const result = await updateActivity(editId, toInput(form));
        if (result.success) {
          setActivities((prev) =>
            prev.map((a) =>
              a.id === editId
                ? {
                    ...a,
                    ...toInput(form),
                    venueType: form.isVenue ? form.venueType : null,
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
        const result = await createActivity(toInput(form));
        if (result.success && result.activity) {
          const created = result.activity;
          setActivities((prev) => [...prev, created]);
          toast.success("Activity added");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to create");
        }
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const activity = activities.find((a) => a.id === id);
    if (!activity) return;
    if (!window.confirm(`Delete "${activity.name}"? This cannot be undone.`))
      return;

    const result = await deleteActivity(id);
    if (result.success) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast.success("Activity deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  function handleMove(index: number, direction: "up" | "down") {
    const next = [...activities];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    const a = next[index];
    const b = next[swap];
    if (!a || !b) return;
    next[index] = b;
    next[swap] = a;
    const previous = activities;
    setActivities(next);

    startTransition(async () => {
      const result = await reorderActivities(next.map((x) => x.id));
      if (!result.success) {
        setActivities(previous);
        toast.error("Failed to reorder");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Things to Do</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curate activities and venues. These appear on your public
            things-to-do page.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No activities yet</p>
          <p className="text-sm mt-1">Add your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="relative border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {activity.emoji && (
                    <span className="text-2xl shrink-0">{activity.emoji}</span>
                  )}
                  <h3 className="font-medium truncate">{activity.name}</h3>
                </div>
                {activity.isVenue && (
                  <Badge variant="default">
                    {activity.venueType
                      ? VENUE_TYPE_LABELS[activity.venueType]
                      : "Venue"}
                  </Badge>
                )}
              </div>

              {activity.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {activity.description}
                </p>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                {activity.address && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{activity.address}</span>
                  </p>
                )}
                {activity.link && (
                  <a
                    href={activity.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Link
                  </a>
                )}
              </div>

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
                    disabled={index === activities.length - 1 || isPending}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(activity)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(activity.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Activity" : "Add Activity"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-name">Name *</Label>
                <Input
                  id="activity-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sunset Catamaran Cruise"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-emoji">Emoji</Label>
                <Input
                  id="activity-emoji"
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  placeholder="🏖️"
                  className="w-20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="A brief description..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-address">Address</Label>
              <Input
                id="activity-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Beach Rd, City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-link">Link</Label>
                <Input
                  id="activity-link"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-image">Image URL</Label>
                <Input
                  id="activity-image"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="activity-is-venue">Wedding venue</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show under "Venues" instead of the activities list.
                </p>
              </div>
              <Switch
                id="activity-is-venue"
                checked={form.isVenue}
                onCheckedChange={(checked) =>
                  setForm({
                    ...form,
                    isVenue: checked,
                    venueType: checked ? form.venueType : null,
                  })
                }
              />
            </div>
            {form.isVenue && (
              <div className="space-y-2">
                <Label htmlFor="activity-venue-type">Venue type</Label>
                <Select
                  value={form.venueType ?? "ceremony"}
                  onValueChange={(v) =>
                    setForm({ ...form, venueType: v as VenueType })
                  }
                >
                  <SelectTrigger id="activity-venue-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
