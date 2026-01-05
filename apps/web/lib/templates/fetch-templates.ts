import { getResendClient } from "@/lib/email/resend-client";

export interface Template {
  id: string;
  name: string;
  subject?: string;
  html?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Fetch all templates from Resend (server-side only)
 */
export async function fetchTemplates(): Promise<Template[]> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error("Resend client not configured");
      return [];
    }

    const { data, error } = await resend.templates.list();

    if (error) {
      console.error("Error listing templates:", error);
      return [];
    }

    return (data?.data || []) as Template[];
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
}

/**
 * Fetch a single template by ID from Resend (server-side only)
 */
export async function fetchTemplate(
  templateId: string,
): Promise<Template | null> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error("Resend client not configured");
      return null;
    }

    const { data, error } = await resend.templates.get(templateId);

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return data as Template | null;
  } catch (error) {
    console.error("Error fetching template:", error);
    return null;
  }
}
