"use client";

import { Badge } from "@workspace/ui/components/badge";
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
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Download,
  Eye,
  FileText,
  ImageIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UploadDropzone } from "@/lib/uploadthing-components";
import {
  createDocument,
  type Document,
  type DocumentCategory,
  deleteDocument,
  updateDocument,
} from "./actions";

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "receipt", label: "Receipt" },
  { value: "floor_plan", label: "Floor Plan" },
  { value: "timeline", label: "Timeline" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  contract: "bg-blue-100 text-blue-800",
  receipt: "bg-green-100 text-green-800",
  floor_plan: "bg-purple-100 text-purple-800",
  timeline: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
};

type PendingUpload = {
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
};

interface EditState {
  id: string;
  title: string;
  description: string;
  category: DocumentCategory;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.startsWith("image/"))
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-red-500" />;
}

interface DocumentsManagerProps {
  initialDocuments: Document[];
}

export function DocumentsManager({ initialDocuments }: DocumentsManagerProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    DocumentCategory | "all"
  >("all");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(
    null,
  );
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<DocumentCategory>("other");
  const [isSaving, setIsSaving] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = documents.filter((d) => {
    const matchesSearch =
      !search || d.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  async function handleSaveDocument() {
    if (!pendingUpload) return;
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    const result = await createDocument({
      title: newTitle,
      description: newDescription,
      file_url: pendingUpload.url,
      file_type: pendingUpload.type,
      file_size: pendingUpload.size,
      category: newCategory,
      uploaded_by: pendingUpload.uploadedBy,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success("Document saved");
      setPendingUpload(null);
      setNewTitle("");
      setNewDescription("");
      setNewCategory("other");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save document");
    }
  }

  function cancelPending() {
    setPendingUpload(null);
    setNewTitle("");
    setNewDescription("");
    setNewCategory("other");
  }

  function startEdit(doc: Document) {
    setEditState({
      id: doc.id,
      title: doc.title,
      description: doc.description || "",
      category: doc.category,
    });
  }

  async function handleUpdate() {
    if (!editState) return;
    if (!editState.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsUpdating(true);
    const result = await updateDocument(editState.id, {
      title: editState.title,
      description: editState.description,
      category: editState.category,
    });
    setIsUpdating(false);

    if (result.success) {
      toast.success("Document updated");
      setEditState(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteDocument(id);
    setDeletingId(null);

    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } else {
      toast.error(result.error || "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-1">
            Document Center
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload and manage wedding documents
          </p>
        </div>
      </div>

      {/* Upload area */}
      {!pendingUpload && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-3">Upload Document</p>
          <UploadDropzone
            endpoint="documentUploader"
            onClientUploadComplete={(res) => {
              const file = res[0];
              if (!file) return;
              setPendingUpload({
                url: file.url,
                name: file.name,
                size: file.size,
                type: file.type ?? "application/octet-stream",
                uploadedBy:
                  (file.serverData as { uploadedBy?: string })?.uploadedBy ??
                  "admin",
              });
              setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
            }}
            onUploadError={(error) => {
              toast.error(error.message || "Upload failed");
            }}
            className="ut-label:text-sm ut-allowed-content:text-xs"
          />
        </div>
      )}

      {/* Pending upload metadata form */}
      {pendingUpload && (
        <div className="border rounded-lg p-4 space-y-4 bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {fileIcon(pendingUpload.type)}
              <span className="text-sm font-medium">{pendingUpload.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(pendingUpload.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelPending}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="doc-title">Title *</Label>
              <Input
                id="doc-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Venue Contract"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-category">Category</Label>
              <Select
                value={newCategory}
                onValueChange={(v) => setNewCategory(v as DocumentCategory)}
              >
                <SelectTrigger id="doc-category">
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
          </div>

          <div className="space-y-1">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional notes about this document..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveDocument} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Document"}
            </Button>
            <Button variant="outline" onClick={cancelPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {(["all", ...CATEGORIES.map((c) => c.value)] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat as DocumentCategory | "all")}
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
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {documents.length === 0
            ? "No documents yet. Upload one above."
            : "No documents match your filters."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 flex flex-col gap-3"
            >
              {editState?.id === doc.id ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input
                        value={editState.title}
                        onChange={(e) =>
                          setEditState((s) =>
                            s ? { ...s, title: e.target.value } : s,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Category</Label>
                      <Select
                        value={editState.category}
                        onValueChange={(v) =>
                          setEditState((s) =>
                            s ? { ...s, category: v as DocumentCategory } : s,
                          )
                        }
                      >
                        <SelectTrigger>
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
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea
                      value={editState.description}
                      onChange={(e) =>
                        setEditState((s) =>
                          s ? { ...s, description: e.target.value } : s,
                        )
                      }
                      rows={2}
                    />
                  </div>
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
                      onClick={() => setEditState(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{fileIcon(doc.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{doc.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[doc.category]}`}
                      >
                        {CATEGORIES.find((c) => c.value === doc.category)
                          ?.label ?? doc.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(doc.file_size)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" asChild title="Preview">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild title="Download">
                      <a href={doc.file_url} download={doc.title}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(doc)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      title="Delete"
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
    </div>
  );
}
