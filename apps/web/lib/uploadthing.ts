import { currentUser } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { isAdmin } from "@/lib/auth/admin";

const f = createUploadthing();

// Check if user is an admin
async function checkAdmin() {
  const user = await currentUser();

  if (!user) {
    throw new UploadThingError("Unauthorized");
  }

  const { authorized } = await isAdmin();
  if (!authorized) {
    throw new UploadThingError("Forbidden");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  return { userId: user.id, email: userEmail };
}

export const ourFileRouter: FileRouter = {
  // Photo uploader for wedding gallery (admin only)
  photoUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 10,
    },
  })
    .middleware(async () => {
      const user = await checkAdmin();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  // Document uploader for wedding document center (admin only)
  documentUploader: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    image: { maxFileSize: "16MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await checkAdmin();
      return { userId: user.userId, email: user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  // Guest photo uploader — no auth required, open to anyone with the link
  guestPhotoUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 5,
    },
  })
    .middleware(async () => {
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
};

export type OurFileRouter = typeof ourFileRouter;
