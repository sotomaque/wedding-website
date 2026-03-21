"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createServiceLink,
  deleteServiceLink,
  reorderServiceLinks,
  type ServiceLink,
  type ServiceLinkCategory,
  updateServiceLink,
} from "./actions";
import { CATEGORIES, CATEGORY_COLORS, getFaviconUrl } from "./constants";

export { CATEGORIES };

type FormState = {
  title: string;
  url: string;
  description: string;
  category: ServiceLinkCategory;
};

const EMPTY_FORM: FormState = {
  title: "",
  url: "",
  description: "",
  category: "other",
};

interface LinkFormFieldsProps {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

function LinkFormFields({ form, onChange }: LinkFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="field-title">Title *</Label>
        <Input
          id="field-title"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. La Jolla Cove Venue"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="field-url">URL *</Label>
        <Input
          id="field-url"
          value={form.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="field-category">Category</Label>
        <Select
          value={form.category}
          onValueChange={(v) =>
            onChange({ category: v as ServiceLinkCategory })
          }
        >
          <SelectTrigger id="field-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="field-description">Description</Label>
        <Input
          id="field-description"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Short description (optional)"
        />
      </div>
    </div>
  );
}

interface VendorsManagerProps {
  initialLinks: ServiceLink[];
}

export function VendorsManager({ initialLinks }: VendorsManagerProps) {
  const [links, setLinks] = useState<ServiceLink[]>(initialLinks);
  const [categoryFilter, setCategoryFilter] = useState<
    ServiceLinkCategory | "all"
  >("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReordering, startReorder] = useTransition();

  const filtered =
    categoryFilter === "all"
      ? links
      : links.filter((l) => l.category === categoryFilter);

  async function handleAdd() {
    if (!addForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!addForm.url.trim()) {
      toast.error("URL is required");
      return;
    }

    setIsAdding(true);
    const result = await createServiceLink(addForm);
    setIsAdding(false);

    if (result.success) {
      toast.success("Link added");
      if (result.link) setLinks((prev) => [...prev, result.link!]);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    } else {
      toast.error(result.error || "Failed to add link");
    }
  }

  function startEdit(link: ServiceLink) {
    setEditId(link.id);
    setEditForm({
      title: link.title,
      url: link.url,
      description: link.description || "",
      category: link.category,
    });
  }

  async function handleUpdate() {
    if (!editId) return;

    setIsUpdating(true);
    const result = await updateServiceLink(editId, editForm);
    setIsUpdating(false);

    if (result.success) {
      toast.success("Link updated");
      if (result.link) {
        setLinks((prev) =>
          prev.map((l) => (l.id === editId ? result.link! : l)),
        );
      }
      setEditId(null);
    } else {
      toast.error(result.error || "Failed to update");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteServiceLink(id);
    setDeletingId(null);

    if (result.success) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Link deleted");
    } else {
      toast.error(result.error || "Failed to delete");
    }
  }

  function moveLink(id: string, direction: "up" | "down") {
    const currentLinks = [...links];
    const idx = currentLinks.findIndex((l) => l.id === id);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= currentLinks.length) return;

    const updated = [...currentLinks];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx]!, updated[idx]!];
    setLinks(updated);

    startReorder(async () => {
      const result = await reorderServiceLinks(updated.map((l) => l.id));

      if (!result.success) {
        setLinks(currentLinks);
        toast.error("Failed to reorder");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-1">
            Vendors & Links
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage vendor links shown on the public vendors page
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-secondary/20">
          <p className="text-sm font-semibold">New Vendor Link</p>
          <LinkFormFields
            form={addForm}
            onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))}
          />
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Link"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setAddForm(EMPTY_FORM);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {(["all", ...CATEGORIES.map((c) => c.value)] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() =>
              setCategoryFilter(cat as ServiceLinkCategory | "all")
            }
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              categoryFilter === cat
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:bg-secondary/50"
            }`}
          >
            {cat === "all"
              ? "All"
              : (CATEGORIES.find((c) => c.value === cat)?.label ?? cat)}
          </button>
        ))}
      </div>

      {/* Link list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {links.length === 0
            ? "No vendor links yet. Add one above."
            : "No links in this category."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((link, idx) => (
            <div key={link.id} className="border rounded-lg p-4">
              {editId === link.id ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <LinkFormFields
                    form={editForm}
                    onChange={(patch) =>
                      setEditForm((f) => ({ ...f, ...patch }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  {/* Favicon */}
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    className="h-5 w-5 rounded shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{link.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[link.category]}`}
                      >
                        {CATEGORIES.find((c) => c.value === link.category)
                          ?.label ?? link.category}
                      </span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 truncate max-w-xs"
                      >
                        {link.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    {link.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveLink(link.id, "up")}
                      disabled={idx === 0 || isReordering}
                      className="p-1 rounded hover:bg-secondary/80 disabled:opacity-30 transition-opacity"
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(link.id, "down")}
                      disabled={idx === filtered.length - 1 || isReordering}
                      className="p-1 rounded hover:bg-secondary/80 disabled:opacity-30 transition-opacity"
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(link)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {links.length} link{links.length !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
