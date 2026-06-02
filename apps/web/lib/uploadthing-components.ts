"use client";

import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/lib/uploadthing";

export const UploadDropzone: ReturnType<
  typeof generateUploadDropzone<OurFileRouter>
> = generateUploadDropzone<OurFileRouter>();

export const UploadButton: ReturnType<
  typeof generateUploadButton<OurFileRouter>
> = generateUploadButton<OurFileRouter>();

// Lower-level hooks for building a custom uploader (used by PhotoUploader so
// the drop area and the file-picker button can be separate click targets).
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
export { useDropzone } from "@uploadthing/react";
