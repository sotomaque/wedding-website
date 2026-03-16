import { z } from "zod";

export const PhotoResponse = z.object({
  id: z.string().uuid().describe("Photo UUID"),
  url: z.string().url().describe("Photo URL"),
  alt: z.string().describe("Alt text"),
  description: z.string().nullable().describe("Photo description"),
  display_order: z.number().describe("Display order"),
  is_active: z.boolean().describe("Whether the photo is active"),
  created_at: z.string().describe("Creation timestamp"),
});

export const PhotoListResponse = z.object({
  photos: z.array(PhotoResponse).describe("List of photos"),
});

export const CreatePhotoBody = z.object({
  url: z.string().url().describe("Photo URL (required)"),
  alt: z.string().describe("Alt text (required)"),
  description: z.string().optional().describe("Photo description"),
});

export const CreatePhotoResponse = z.object({
  photo: PhotoResponse.describe("Created photo"),
});
