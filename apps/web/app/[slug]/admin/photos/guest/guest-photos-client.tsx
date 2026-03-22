"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import QRCode from "react-qr-code";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

interface GuestPhoto {
  id: string;
  url: string;
  uploaderName: string | null;
  isVisible: boolean;
  uploadedAt: string;
}

type Filter = "all" | "visible" | "hidden";

interface GuestPhotosClientProps {
  photos: GuestPhoto[];
  uploadUrl: string;
}

export function GuestPhotosClient({
  photos,
  uploadUrl,
}: GuestPhotosClientProps) {
  const router = useRouter();
  const slug = useWeddingSlug();
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadAll() {
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/guest-photos/download");
      if (!res.ok) {
        alert("No photos to download or an error occurred.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "guest-photos.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const filtered = photos.filter((p) => {
    if (filter === "visible") return p.isVisible;
    if (filter === "hidden") return !p.isVisible;
    return true;
  });

  async function toggleVisibility(photo: GuestPhoto) {
    setLoadingId(photo.id);
    await fetch(`/api/admin/guest-photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !photo.isVisible }),
    });
    setLoadingId(null);
    router.refresh();
  }

  async function deletePhoto(photo: GuestPhoto) {
    if (!confirm("Permanently delete this photo?")) return;
    setLoadingId(photo.id);
    await fetch(`/api/admin/guest-photos/${photo.id}`, { method: "DELETE" });
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* QR Code section */}
      <div className="border border-border rounded-lg p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="bg-white p-3 rounded-md shrink-0">
          <QRCode value={uploadUrl} size={120} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">Guest Upload QR Code</h2>
          <p className="text-sm text-muted-foreground">
            Display this at the reception so guests can scan and upload their
            photos directly to the live slideshow.
          </p>
          <p className="text-xs font-mono text-muted-foreground break-all">
            {uploadUrl}
          </p>
          <div className="flex gap-3 mt-1">
            <a
              href={`/${slug}/slideshow`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              View slideshow →
            </a>
          </div>
        </div>
      </div>

      {/* Filter tabs + Download */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border border-border rounded-lg p-1">
          {(["all", "visible", "hidden"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}{" "}
              <span className="opacity-60">
                (
                {f === "all"
                  ? photos.length
                  : f === "visible"
                    ? photos.filter((p) => p.isVisible).length
                    : photos.filter((p) => !p.isVisible).length}
                )
              </span>
            </button>
          ))}
        </div>

        {photos.length > 0 && (
          <button
            type="button"
            onClick={downloadAll}
            disabled={downloading}
            className="text-sm font-medium border border-border rounded-lg px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {downloading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                Building zip…
              </>
            ) : (
              <>↓ Download All ({photos.length})</>
            )}
          </button>
        )}
      </div>

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          No photos yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className={`group relative rounded-lg overflow-hidden border border-border bg-muted aspect-square ${
                !photo.isVisible ? "opacity-50" : ""
              }`}
            >
              <Image
                src={photo.url}
                alt={
                  photo.uploaderName
                    ? `Photo by ${photo.uploaderName}`
                    : "Guest photo"
                }
                fill
                className="object-cover"
                unoptimized
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    disabled={loadingId === photo.id}
                    onClick={() => toggleVisibility(photo)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {photo.isVisible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    disabled={loadingId === photo.id}
                    onClick={() => deletePhoto(photo)}
                    className="text-xs bg-destructive/80 hover:bg-destructive text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                {photo.uploaderName && (
                  <p className="text-white text-xs truncate">
                    {photo.uploaderName}
                  </p>
                )}
              </div>

              {/* Hidden badge */}
              {!photo.isVisible && (
                <div className="absolute top-1 left-1 text-xs bg-black/60 text-white/70 px-1.5 py-0.5 rounded">
                  Hidden
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
