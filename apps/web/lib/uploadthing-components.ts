"use client";

import {
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
