"use client";

import { generateUploadDropzone } from "@uploadthing/react";

import type { OurFileRouter } from "@/lib/uploadthing";

export const UploadDropzone: ReturnType<
  typeof generateUploadDropzone<OurFileRouter>
> = generateUploadDropzone<OurFileRouter>();
