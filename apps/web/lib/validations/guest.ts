import { z } from "zod";

export const editGuestSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().optional(),
    side: z.enum(["bride", "groom", "both"]),
    list: z.enum(["a", "b", "c"]),
    plusOneAllowed: z.boolean(),
    plusOneFirstName: z.string().optional(),
    plusOneLastName: z.string().optional(),
    mailingAddress: z.string().optional(),
    physicalInviteSent: z.boolean(),
    phoneNumber: z.string().optional(),
    whatsapp: z.string().optional(),
    preferredContactMethod: z
      .enum(["email", "text", "whatsapp", "phone_call"])
      .optional()
      .or(z.literal("")),
    family: z.boolean(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // If email is provided, it must be valid
      if (data.email && data.email.trim() !== "") {
        return z.string().email().safeParse(data.email).success;
      }
      return true;
    },
    {
      message: "Invalid email address",
      path: ["email"],
    },
  );

export type EditGuestFormData = z.infer<typeof editGuestSchema>;

export const addGuestSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().optional(),
    side: z.enum(["bride", "groom", "both"]),
    list: z.enum(["a", "b", "c"]),
    plusOneAllowed: z.boolean(),
    plusOneFirstName: z.string().optional(),
    plusOneLastName: z.string().optional(),
    sendEmail: z.boolean(),
    mailingAddress: z.string().optional(),
    phoneNumber: z.string().optional(),
    whatsapp: z.string().optional(),
    preferredContactMethod: z
      .enum(["email", "text", "whatsapp", "phone_call"])
      .optional()
      .or(z.literal("")),
    family: z.boolean(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // If email is provided, it must be valid
      if (data.email && data.email.trim() !== "") {
        return z.string().email().safeParse(data.email).success;
      }
      return true;
    },
    {
      message: "Invalid email address",
      path: ["email"],
    },
  );

export type AddGuestFormData = z.infer<typeof addGuestSchema>;
