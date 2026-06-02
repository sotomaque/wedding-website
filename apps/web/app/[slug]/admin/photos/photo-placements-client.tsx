"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { GripVertical, X } from "lucide-react";
import Image from "next/image";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { PhotoSection } from "@/lib/photos";
import { getSectionPhotoCap, type PhotoSectionKey } from "@/lib/templates";

interface SectionMeta {
  title: string;
  /** Hint explaining what the first/ordered photos mean for this section. */
  hint: string;
}

export const SECTION_META: Record<PhotoSectionKey, SectionMeta> = {
  hero: {
    title: "Hero banner",
    hint: "The large images at the very top of your site, shown as a rotating banner. The first photo is the cover guests see first.",
  },
  story: {
    title: "Our Story",
    hint: "Photos beside your story text. The first is the main image; the rest fill the grid below it.",
  },
  gallery: {
    title: "Gallery",
    hint: "A dedicated photo gallery further down the page. Shown one after another in this order.",
  },
};

/** Minimal library photo shape the panels need to render thumbnails. */
export interface LibraryPhoto {
  id: string;
  url: string;
  alt: string;
}

export interface AdminPlacement {
  placementId: string;
  photoId: string;
  displayOrder: number;
}

/** Drag payload attached to draggable/sortable items via data.current. */
export type DragData =
  | { type: "library"; photoId: string }
  | {
      type: "placement";
      section: PhotoSection;
      placementId: string;
      photoId: string;
    };

/** Build the droppable/sortable id for a placement row. */
function placementDomId(section: PhotoSection, placementId: string) {
  return `placement:${section}:${placementId}`;
}

interface SortablePlacementProps {
  section: PhotoSection;
  placement: AdminPlacement;
  photo: LibraryPhoto | undefined;
  index: number;
  onRemove: (placementId: string, section: PhotoSection) => void;
}

function SortablePlacement({
  section,
  placement,
  photo,
  index,
  onRemove,
}: SortablePlacementProps) {
  const data: DragData = {
    type: "placement",
    section,
    placementId: placement.placementId,
    photoId: placement.photoId,
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: placementDomId(section, placement.placementId),
    data,
  });

  if (!photo) return null;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 border rounded-md p-2 bg-background ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-muted-foreground w-4 text-center">
        {index + 1}
      </span>
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded">
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="44px"
          className="object-cover"
        />
      </div>
      <span className="text-sm truncate grow">{photo.alt}</span>
      <ConfirmDialog
        trigger={
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
            aria-label={`Remove from ${SECTION_META[section].title}`}
          >
            <X className="h-4 w-4" />
          </Button>
        }
        title={`Remove from ${SECTION_META[section].title}?`}
        description="The photo stays in your library — you can drag it back into this section anytime."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => onRemove(placement.placementId, section)}
      />
    </li>
  );
}

interface SectionDropzoneProps {
  section: PhotoSectionKey;
  placements: AdminPlacement[];
  photosById: Map<string, LibraryPhoto>;
  onRemove: (placementId: string, section: PhotoSection) => void;
  /** A library photo is being dragged — show this as a candidate drop target. */
  isDropTargetActive: boolean;
}

function SectionDropzone({
  section,
  placements,
  photosById,
  onRemove,
  isDropTargetActive,
}: SectionDropzoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section:${section}`,
    data: { type: "section", section },
  });
  const meta = SECTION_META[section];
  const itemIds = placements.map((p) => placementDomId(section, p.placementId));
  const cap = getSectionPhotoCap(section);
  const count = placements.length;
  const isFull = cap !== null && count >= cap;
  // "3 / 8 photos" when capped, "5 photos" when not.
  const countLabel =
    cap !== null
      ? `${count} / ${cap} photos`
      : `${count} photo${count === 1 ? "" : "s"}`;
  // Highlight as a candidate only while a library photo is being dragged and
  // this section still has room; the hovered target gets the stronger ring.
  const showAsTarget = isDropTargetActive && !isFull;

  return (
    <section className="border rounded-lg p-4 bg-background">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{meta.title}</h3>
          <p className="text-sm text-muted-foreground">{meta.hint}</p>
        </div>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium mt-0.5",
            isFull
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          {countLabel}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "rounded-md transition-colors",
          showAsTarget && "ring-1 ring-primary/40 bg-primary/5",
          isOver && !isFull && "ring-2 ring-primary bg-primary/10",
          isOver && isFull && "ring-2 ring-destructive/60",
        )}
      >
        {placements.length === 0 ? (
          <p className="text-sm text-muted-foreground italic border border-dashed rounded-md py-6 text-center">
            {isDropTargetActive
              ? `Drop here to add to ${meta.title}`
              : "Drag photos here from your library"}
          </p>
        ) : (
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {placements.map((placement, index) => (
                <SortablePlacement
                  key={placement.placementId}
                  section={section}
                  placement={placement}
                  photo={photosById.get(placement.photoId)}
                  index={index}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </SortableContext>
        )}
        {isFull && (
          <p className="text-xs text-muted-foreground mt-2">
            {meta.title} is full ({cap} max). Remove one to add another.
          </p>
        )}
      </div>
    </section>
  );
}

interface SectionsColumnProps {
  sections: PhotoSectionKey[];
  placements: Record<PhotoSection, AdminPlacement[]>;
  photosById: Map<string, LibraryPhoto>;
  onRemove: (placementId: string, section: PhotoSection) => void;
  /** True while a library photo is mid-drag, to light up drop targets. */
  isDropTargetActive: boolean;
}

/** Right column: one drag-and-drop ordered list per photo-consuming section. */
export function SectionsColumn({
  sections,
  placements,
  photosById,
  onRemove,
  isDropTargetActive,
}: SectionsColumnProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Where photos appear</h2>
        <p className="text-sm text-muted-foreground">
          Each section is a different place on your live page. Drag a photo from
          your library into one to show it there, then drag the handle to set
          the order. Only the sections your template uses are shown.
        </p>
      </div>
      {sections.map((section) => (
        <SectionDropzone
          key={section}
          section={section}
          placements={placements[section]}
          photosById={photosById}
          onRemove={onRemove}
          isDropTargetActive={isDropTargetActive}
        />
      ))}
    </div>
  );
}
