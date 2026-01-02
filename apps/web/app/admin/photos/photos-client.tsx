"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { Check, Edit2, GripVertical, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Photo } from "@/lib/photos";
import { UploadDropzone } from "@/lib/uploadthing-components";

interface AdminPhotosClientProps {
  initialPhotos: Photo[];
}

export function AdminPhotosClient({ initialPhotos }: AdminPhotosClientProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ alt: "", description: "" });

  const handleUploadComplete = async (res: { url: string; name: string }[]) => {
    for (const file of res) {
      try {
        const response = await fetch("/api/admin/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: file.url,
            alt: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            description: "",
          }),
        });

        if (!response.ok) throw new Error("Failed to save photo");

        const data = await response.json();
        setPhotos((prev) => [...prev, data.photo]);
      } catch (error) {
        console.error("Error saving photo:", error);
        toast.error(`Failed to save ${file.name}`);
      }
    }
    toast.success(`${res.length} photo(s) uploaded successfully`);
    router.refresh();
  };

  const handleToggleActive = async (photo: Photo) => {
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !photo.is_active }),
      });

      if (!response.ok) throw new Error("Failed to update photo");

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, is_active: !p.is_active } : p,
        ),
      );
      toast.success(photo.is_active ? "Photo hidden" : "Photo visible");
    } catch (error) {
      console.error("Error updating photo:", error);
      toast.error("Failed to update photo");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const response = await fetch(`/api/admin/photos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete photo");

      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success("Photo deleted");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    }
  };

  const startEditing = (photo: Photo) => {
    setEditingId(photo.id);
    setEditForm({ alt: photo.alt, description: photo.description || "" });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ alt: "", description: "" });
  };

  const saveEditing = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to update photo");

      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...editForm } : p)),
      );
      setEditingId(null);
      toast.success("Photo updated");
    } catch (error) {
      console.error("Error updating photo:", error);
      toast.error("Failed to update photo");
    }
  };

  const movePhoto = async (id: string, direction: "up" | "down") => {
    const index = photos.findIndex((p) => p.id === id);
    if (
      index === -1 ||
      (direction === "up" && index === 0) ||
      (direction === "down" && index === photos.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const swapPhoto = photos[swapIndex];

    if (!swapPhoto) return;

    const newPhotos = [...photos];
    const removed = newPhotos[index];
    if (!removed) return;

    newPhotos.splice(index, 1);
    newPhotos.splice(newIndex, 0, removed);

    setPhotos(newPhotos.map((p, i) => ({ ...p, display_order: i })));

    // Update in database - only update the two swapped photos
    try {
      await Promise.all([
        fetch(`/api/admin/photos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: newIndex }),
        }),
        fetch(`/api/admin/photos/${swapPhoto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: index }),
        }),
      ]);
    } catch (error) {
      console.error("Error reordering photos:", error);
      toast.error("Failed to reorder photos");
      router.refresh();
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Photos</h1>
        <p className="text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="mb-8">
        <UploadDropzone
          endpoint="photoUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error: Error) => {
            toast.error(`Upload failed: ${error.message}`);
          }}
          appearance={{
            container: "p-2",
            button:
              "font-medium px-2 bg-primary text-primary-foreground hover:bg-primary/90 mb-2",
          }}
        />
      </div>

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No photos uploaded yet.</p>
          <p className="text-sm mt-2">Upload photos above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`relative border rounded-lg overflow-hidden ${
                !photo.is_active ? "opacity-50" : ""
              }`}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              {/* Controls Overlay */}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => movePhoto(photo.id, "up")}
                  disabled={index === 0}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Info Section */}
              <div className="p-4 bg-background">
                {editingId === photo.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.alt}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          alt: e.target.value,
                        }))
                      }
                      placeholder="Alt text"
                    />
                    <Input
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Description"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEditing(photo.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium truncate">{photo.alt}</h3>
                    {photo.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {photo.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={photo.is_active}
                          onCheckedChange={() => handleToggleActive(photo)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {photo.is_active ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEditing(photo)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(photo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
