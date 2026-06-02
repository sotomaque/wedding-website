"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Check, Edit2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { AdminPlacement, Photo, PhotoSection } from "@/lib/photos";
import { getSectionPhotoCap, type PhotoSectionKey } from "@/lib/templates";
import {
  type DragData,
  type LibraryPhoto,
  SectionsColumn,
} from "./photo-placements-client";
import { PhotoUploader } from "./photo-uploader";

interface AdminPhotosClientProps {
  initialPhotos: Photo[];
  /** Photo-consuming sections for the active template, in render order. */
  photoSections: PhotoSectionKey[];
  initialPlacements: Record<PhotoSection, AdminPlacement[]>;
}

/** Resolve which section an `over` target belongs to, whether it's a section
 *  dropzone or a placement row inside one. */
function sectionFromOver(
  overData: Record<string, unknown> | undefined,
): PhotoSection | null {
  if (!overData) return null;
  if (overData.type === "section") return overData.section as PhotoSection;
  if (overData.type === "placement") return overData.section as PhotoSection;
  return null;
}

export function AdminPhotosClient({
  initialPhotos,
  photoSections,
  initialPlacements,
}: AdminPhotosClientProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [placements, setPlacements] =
    useState<Record<PhotoSection, AdminPlacement[]>>(initialPlacements);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ alt: "", description: "" });
  const [activePhoto, setActivePhoto] = useState<LibraryPhoto | null>(null);
  // Whether the in-progress drag started from the library (vs. reordering a
  // placed photo) — drives the "drop here" highlight on section targets.
  const [draggingFromLibrary, setDraggingFromLibrary] = useState(false);

  const photosById = useMemo(() => {
    const map = new Map<string, LibraryPhoto>();
    for (const photo of photos) {
      map.set(photo.id, {
        id: photo.id,
        url: photo.url,
        alt: photo.alt,
      });
    }
    return map;
  }, [photos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // --- Library management --------------------------------------------------

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
    toast.success(`${res.length} photo(s) uploaded`);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/photos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete photo");
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      // Deleting the library photo cascades to its placements server-side;
      // mirror that in the UI so it leaves every section too.
      setPlacements((prev) => {
        const next = {} as Record<PhotoSection, AdminPlacement[]>;
        for (const section of Object.keys(prev) as PhotoSection[]) {
          next[section] = prev[section].filter((p) => p.photoId !== id);
        }
        return next;
      });
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

  // --- Placement mutations -------------------------------------------------

  const assign = async (photoId: string, section: PhotoSection) => {
    if (placements[section].some((p) => p.photoId === photoId)) return;
    const cap = getSectionPhotoCap(section);
    if (cap !== null && placements[section].length >= cap) {
      toast.error(`The ${section} section holds at most ${cap} photos.`);
      return;
    }
    try {
      const response = await fetch("/api/admin/photos/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, section }),
      });
      if (!response.ok) throw new Error("Failed to assign photo");
      const { placement } = await response.json();
      setPlacements((prev) => ({
        ...prev,
        [section]: [
          ...prev[section],
          {
            placementId: placement.id,
            photoId: placement.photoId,
            displayOrder: placement.displayOrder,
          },
        ],
      }));
    } catch (error) {
      console.error("Error assigning photo:", error);
      toast.error("Failed to add photo to section");
    }
  };

  const removePlacement = async (
    placementId: string,
    section: PhotoSection,
  ) => {
    const previous = placements[section];
    setPlacements((prev) => ({
      ...prev,
      [section]: prev[section].filter((p) => p.placementId !== placementId),
    }));
    try {
      const response = await fetch(
        `/api/admin/photos/placements/${placementId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to remove placement");
    } catch (error) {
      console.error("Error removing placement:", error);
      toast.error("Failed to remove photo from section");
      setPlacements((prev) => ({ ...prev, [section]: previous }));
    }
  };

  const reorder = async (section: PhotoSection, ordered: AdminPlacement[]) => {
    const previous = placements[section];
    setPlacements((prev) => ({ ...prev, [section]: ordered }));
    try {
      const response = await fetch("/api/admin/photos/placements/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          orderedPlacementIds: ordered.map((p) => p.placementId),
        }),
      });
      if (!response.ok) throw new Error("Failed to reorder");
    } catch (error) {
      console.error("Error reordering placements:", error);
      toast.error("Failed to reorder photos");
      setPlacements((prev) => ({ ...prev, [section]: previous }));
      router.refresh();
    }
  };

  // --- Drag and drop -------------------------------------------------------

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) setActivePhoto(photosById.get(data.photoId) ?? null);
    setDraggingFromLibrary(data?.type === "library");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePhoto(null);
    setDraggingFromLibrary(false);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as DragData | undefined;
    if (!activeData) return;

    if (activeData.type === "library") {
      // Dropping a library photo onto (or into) a section adds it there.
      const section = sectionFromOver(
        over.data.current as Record<string, unknown> | undefined,
      );
      if (section) assign(activeData.photoId, section);
      return;
    }

    // Reordering a placed photo — only within its own section.
    const overData = over.data.current as Record<string, unknown> | undefined;
    if (
      overData?.type !== "placement" ||
      overData.section !== activeData.section
    ) {
      return;
    }
    const section = activeData.section;
    const ids = placements[section].map((p) => p.placementId);
    const oldIndex = ids.indexOf(activeData.placementId);
    const newIndex = ids.indexOf(overData.placementId as string);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    reorder(section, arrayMove(placements[section], oldIndex, newIndex));
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Photos</h1>
        <p className="text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActivePhoto(null);
          setDraggingFromLibrary(false);
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: photo library (the asset shelf) */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Photo library</h2>
              <p className="text-sm text-muted-foreground">
                Every photo you've uploaded lives here. A photo only appears on
                your site once you drag it into a section on the right — photos
                that aren't in any section stay private.
              </p>
            </div>

            <PhotoUploader onUploaded={handleUploadComplete} />

            {photos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No photos uploaded yet.</p>
                <p className="text-sm mt-2">Upload photos above to start.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <LibraryCard
                    key={photo.id}
                    photo={photo}
                    isEditing={editingId === photo.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onStartEdit={() => startEditing(photo)}
                    onCancelEdit={cancelEditing}
                    onSaveEdit={() => saveEditing(photo.id)}
                    onDelete={() => handleDelete(photo.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: where photos appear (drives the live site) */}
          <SectionsColumn
            sections={photoSections}
            placements={placements}
            photosById={photosById}
            onRemove={removePlacement}
            isDropTargetActive={draggingFromLibrary}
          />
        </div>

        <DragOverlay>
          {activePhoto && (
            <div className="relative h-20 w-20 overflow-hidden rounded-md shadow-lg ring-2 ring-primary">
              <Image
                src={activePhoto.url}
                alt={activePhoto.alt}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface LibraryCardProps {
  photo: Photo;
  isEditing: boolean;
  editForm: { alt: string; description: string };
  setEditForm: Dispatch<SetStateAction<{ alt: string; description: string }>>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function LibraryCard({
  photo,
  isEditing,
  editForm,
  setEditForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: LibraryCardProps) {
  // The thumbnail is the drag handle so the manage controls below stay
  // clickable. Payload identifies this as a library photo for handleDragEnd.
  const data: DragData = { type: "library", photoId: photo.id };
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `lib:${photo.id}`,
    data,
  });

  return (
    <div className="relative border rounded-lg overflow-hidden">
      <button
        type="button"
        ref={setNodeRef}
        className="block w-full aspect-square relative cursor-grab touch-none"
        aria-label={`Drag "${photo.alt}" into a section`}
        {...attributes}
        {...listeners}
      >
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          className="object-cover pointer-events-none"
          sizes="(max-width: 640px) 50vw, 200px"
        />
      </button>

      <div className="p-3 bg-background">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editForm.alt}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, alt: e.target.value }))
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
              placeholder="Caption"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-medium text-sm truncate">{photo.alt}</h3>
            {photo.description && (
              <p className="text-xs text-muted-foreground truncate">
                {photo.description}
              </p>
            )}
            <div className="flex items-center justify-end mt-2">
              <div className="flex gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onStartEdit}
                  aria-label="Edit caption"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Delete Photo"
                  description="Delete this photo from your library? It will be removed from every section it's in. This cannot be undone."
                  confirmLabel="Delete"
                  variant="destructive"
                  onConfirm={onDelete}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
