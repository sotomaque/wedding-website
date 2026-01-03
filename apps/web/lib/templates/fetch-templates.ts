import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

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
