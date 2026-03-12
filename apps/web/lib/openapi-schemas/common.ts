import { z } from "zod";

// Common path params
export const IdParams = z.object({
  id: z.string().uuid().describe("Resource UUID"),
});

// Common error responses
export const ErrorResponse = z.object({
  error: z.string().describe("Error message"),
});

export const SuccessResponse = z.object({
  success: z.boolean().describe("Whether the operation succeeded"),
});
