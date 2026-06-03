"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { UploadCloud } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { useDropzone, useUploadThing } from "@/lib/uploadthing-components";

interface PhotoUploaderProps {
  /** Called with the uploaded files once UploadThing finishes. */
  onUploaded: (files: { url: string; name: string }[]) => void;
}

/**
 * Custom uploader so the whole box accepts drag-and-drop but only the
 * "Choose files" button opens the file picker. UploadThing's stock
 * UploadDropzone makes the entire area click-to-open, which we don't want.
 */
export function PhotoUploader({ onUploaded }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("photoUploader", {
    onClientUploadComplete: (res) => {
      onUploaded(
        res.map((file) => ({
          url: file.ufsUrl ?? file.url,
          name: file.name,
        })),
      );
    },
    onUploadError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    maxFiles: 10,
    disabled: isUploading,
    onDrop: (files) => {
      if (files.length > 0) startUpload(files);
    },
  });

  // Spread react-dropzone's root props for drag handling, but strip the
  // click/keyboard handlers so the container itself never opens the picker —
  // only the button below does.
  const {
    onClick: _onClick,
    onKeyDown: _onKeyDown,
    ...rootProps
  } = getRootProps();

  return (
    <div
      {...rootProps}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-border",
        isUploading && "opacity-60",
      )}
    >
      <input {...getInputProps()} ref={inputRef} className="hidden" />
      <UploadCloud className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {isDragActive
          ? "Drop your photos to upload"
          : "Drag and drop photos here"}
      </p>
      <Button
        type="button"
        size="sm"
        disabled={isUploading}
        className="cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading…" : "Choose files"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Up to 10 images at a time, 8&nbsp;MB each.
      </p>
    </div>
  );
}
