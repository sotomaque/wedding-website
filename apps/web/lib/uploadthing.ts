import { currentUser } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { env } from "@/env";

const f = createUploadthing();

// Check if user is an admin
async function checkAdmin() {
  const user = await currentUser();

  if (!user) {
    throw new UploadThingError("Unauthorized");
  }

  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
    e.trim().toLowerCase(),
  );
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

  if (!adminEmails?.includes(userEmail || "")) {
    throw new UploadThingError("Forbidden");
  }

  return { userId: user.id, email: userEmail };
}

export const ourFileRouter: FileRouter = {
  // Photo uploader for wedding gallery
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
};

export type OurFileRouter = typeof ourFileRouter;
