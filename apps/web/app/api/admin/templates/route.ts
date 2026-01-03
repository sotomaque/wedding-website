import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

// GET /api/admin/templates - List all templates
export async function GET(): Promise<NextResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await resend.templates.list();

    if (error) {
      console.error("Error listing templates:", error);
      return NextResponse.json(
        { error: error.message || "Failed to list templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: data?.data || [] });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 },
    );
  }
}

// POST /api/admin/templates - Create a new template
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, html, variables, publish } = body;

    if (!name || !html) {
      return NextResponse.json(
        { error: "Name and HTML are required" },
        { status: 400 },
      );
    }

    // Reserved variable names in Resend - these are auto-populated and cannot be defined
    const RESERVED_VARIABLES = [
      "FIRST_NAME",
      "LAST_NAME",
      "EMAIL",
      "RESEND_UNSUBSCRIBE_URL",
      "contact",
      "this",
    ];

    // Filter out reserved variables and transform the rest
    const customVariables =
      variables && Array.isArray(variables)
        ? variables
            .filter((v: { key: string }) => !RESERVED_VARIABLES.includes(v.key))
            .map(
              (v: {
                key: string;
                type: "string" | "number";
                fallbackValue: string | number;
              }) => {
                if (v.type === "number") {
                  return {
                    key: v.key,
                    type: "number" as const,
                    fallbackValue:
                      typeof v.fallbackValue === "number"
                        ? v.fallbackValue
                        : Number(v.fallbackValue) || null,
                  };
                }
                return {
                  key: v.key,
                  type: "string" as const,
                  fallbackValue: String(v.fallbackValue || ""),
                };
              },
            )
        : undefined;

    console.log("Creating template with:", {
      name,
      subject,
      hasHtml: !!html,
      variables: customVariables,
    });

    const { data, error } = await resend.templates.create({
      name,
      html,
      ...(subject && { subject }),
      ...(customVariables &&
        customVariables.length > 0 && { variables: customVariables }),
    });

    console.log("Resend response:", { data, error });

    if (error) {
      console.error("Error creating template:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create template" },
        { status: 500 },
      );
    }

    // Publish if requested
    if (publish && data?.id) {
      await resend.templates.publish(data.id);
    }

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
