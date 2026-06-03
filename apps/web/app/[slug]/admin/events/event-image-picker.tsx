"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing-components";

interface GalleryPhoto {
  id: string;
  url: string;
  alt: string;
}

/**
 * Picks the share-preview image for an event: upload a new photo (UploadThing)
 * or choose one already in the gallery. Stores the resulting URL via onChange.
 */
export function EventImagePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);

  // Lazy-load the gallery the first time the picker is opened.
  useEffect(() => {
    if (!galleryOpen || photos !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/photos");
        const data = await res.json();
        if (!cancelled) setPhotos(data.photos ?? []);
      } catch {
        if (!cancelled) setPhotos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryOpen, photos]);

  return (
    <div className="space-y-2">
      {/* biome-ignore lint/a11y/noLabelWithoutControl: labels the picker controls below */}
      <label className="text-sm font-medium">Share preview image</label>
      <p className="text-xs text-muted-foreground">
        Shown when the public RSVP link is shared (iMessage, social). Leave
        empty for a styled card.
      </p>

      {value ? (
        <div className="relative w-full max-w-sm">
          {/* biome-ignore lint/performance/noImgElement: simple admin preview */}
          <img
            src={value}
            alt="Event share preview"
            className="w-full aspect-[1200/630] object-cover rounded-md border border-border"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove image"
            className="absolute top-2 right-2 rounded-full bg-background/90 border border-border p-1 hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm aspect-[1200/630] rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 opacity-40" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <UploadButton
          endpoint="photoUploader"
          appearance={{
            button:
              "h-9 px-3 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md",
            allowedContent: "hidden",
          }}
          content={{ button: "Upload" }}
          onClientUploadComplete={(res) => {
            const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
            if (url) {
              onChange(url);
              toast.success("Image uploaded");
            }
          }}
          onUploadError={(err) => {
            toast.error(`Upload failed: ${err.message}`);
          }}
        />

        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              Choose from gallery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Choose a photo</DialogTitle>
            </DialogHeader>
            {photos === null ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Loading…
              </p>
            ) : photos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No photos in your gallery yet. Upload one above, or add photos
                in Site → Photos.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.url);
                      setGalleryOpen(false);
                    }}
                    className="group relative aspect-square rounded-md overflow-hidden border border-border hover:border-primary"
                  >
                    {/* biome-ignore lint/performance/noImgElement: gallery thumb */}
                    <img
                      src={p.url}
                      alt={p.alt}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
