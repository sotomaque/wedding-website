"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ImagePlus, X } from "lucide-react";
import { useCallback, useRef } from "react";

interface OnboardingPhotoUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function OnboardingPhotoUpload({
  files,
  onChange,
  maxFiles = 10,
}: OnboardingPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const incoming = Array.from(newFiles).filter((f) =>
        f.type.startsWith("image/"),
      );
      const combined = [...files, ...incoming].slice(0, maxFiles);
      onChange(combined);
    },
    [files, maxFiles, onChange],
  );

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div className="space-y-4">
      {/* Drop zone — div needed for drag-and-drop events */}
      {/* biome-ignore lint/a11y/useSemanticElements: div required for drag-and-drop target with role="button" fallback */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer transition-colors",
          "hover:border-accent/50 hover:bg-accent/5",
          files.length >= maxFiles && "opacity-50 pointer-events-none",
        )}
      >
        <ImagePlus className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            Drop photos here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Up to {maxFiles} images, 8MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Thumbnail grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {files.map((file, index) => (
            <PhotoThumbnail
              key={`${file.name}-${file.lastModified}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoThumbnail({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const url = URL.createObjectURL(file);

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden border border-border">
      {/* biome-ignore lint/performance/noImgElement: blob URLs from client-side File objects cannot use next/image */}
      <img
        src={url}
        alt={file.name}
        className="h-full w-full object-cover"
        onLoad={() => URL.revokeObjectURL(url)}
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
