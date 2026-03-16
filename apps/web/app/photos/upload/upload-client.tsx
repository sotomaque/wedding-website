"use client";

import { useState } from "react";
import { saveGuestPhoto } from "@/app/photos/actions";
import { UploadDropzone } from "@/lib/uploadthing-components";

export function UploadClient() {
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-12">
        <div className="text-5xl">📸</div>
        <h2 className="text-2xl font-serif">Thanks for sharing!</h2>
        <p className="text-muted-foreground">
          Your photo is live on the slideshow.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setError(null);
            setName("");
          }}
          className="mt-4 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          Upload another photo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <div className="flex flex-col gap-2">
        <label htmlFor="uploader-name" className="text-sm font-medium">
          Your name <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="uploader-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aunt Maria"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <UploadDropzone
        endpoint="guestPhotoUploader"
        onClientUploadComplete={async (res) => {
          setError(null);
          for (const file of res) {
            const result = await saveGuestPhoto(
              file.ufsUrl ?? file.url,
              name.trim() || null,
            );
            if (!result.success) {
              setError(
                "Something went wrong saving your photo. Please try again.",
              );
              return;
            }
          }
          setDone(true);
        }}
        onUploadError={(err) => {
          setError(err.message ?? "Upload failed. Please try again.");
        }}
      />
    </div>
  );
}
