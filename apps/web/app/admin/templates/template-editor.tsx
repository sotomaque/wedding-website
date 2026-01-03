"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Eye, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Template } from "@/lib/templates/fetch-templates";

interface Variable {
  key: string;
  type: "string" | "number";
  fallbackValue: string | number;
}

interface TemplateEditorProps {
  mode: "create" | "edit";
  templateId?: string;
  initialTemplate?: Template;
}

export function TemplateEditor({
  mode,
  templateId,
  initialTemplate,
}: TemplateEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [name, setName] = useState(initialTemplate?.name || "");
  const [subject, setSubject] = useState(initialTemplate?.subject || "");
  const [html, setHtml] = useState(initialTemplate?.html || "");
  const [variables, setVariables] = useState<Variable[]>([]);
  const [publishOnSave, setPublishOnSave] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!html.trim()) {
      toast.error("Template HTML is required");
      return;
    }

    setIsSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/admin/templates"
          : `/api/admin/templates/${templateId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const body: {
        name: string;
        subject?: string;
        html: string;
        variables?: Variable[];
        publish?: boolean;
      } = {
        name: name.trim(),
        html: html.trim(),
      };

      if (subject.trim()) {
        body.subject = subject.trim();
      }

      if (variables.length > 0) {
        body.variables = variables;
      }

      if (mode === "create" && publishOnSave) {
        body.publish = true;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      const data = await response.json();

      toast.success(
        mode === "create" ? "Template created" : "Template updated",
      );

      if (mode === "create") {
        router.push(`/admin/templates/${data.template.id}`);
      } else {
        router.push(`/admin/templates/${templateId}`);
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save template",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function addVariable() {
    setVariables([
      ...variables,
      { key: "", type: "string", fallbackValue: "" },
    ]);
  }

  function updateVariable(index: number, updates: Partial<Variable>) {
    setVariables(
      variables.map((v, i) => (i === index ? { ...v, ...updates } : v)),
    );
  }

  function removeVariable(index: number) {
    setVariables(variables.filter((_, i) => i !== index));
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link
        href="/admin/templates"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create Template" : "Edit Template"}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., wedding-invitation"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., You're Invited to Our Wedding!"
            />
          </div>

          {/* HTML */}
          <div className="space-y-2">
            <Label htmlFor="html">HTML Content *</Label>
            <Textarea
              id="html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Enter your HTML email template..."
              className="font-mono text-sm min-h-[400px]"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{{"} VARIABLE_NAME {"}}}"} for dynamic content
            </p>
          </div>

          {/* Variables */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Template Variables</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariable}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Variable
              </Button>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Define all variables your template uses. Common variables:
              FIRST_NAME, LAST_NAME, INVITE_CODE, RSVP_URL, APP_URL,
              WEDDING_DATE.
            </p>

            {variables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom variables defined.
              </p>
            ) : (
              <div className="space-y-3">
                {variables.map((variable, index) => (
                  <div
                    key={`var-${index}-${variable.key}`}
                    className="flex items-start gap-2 p-3 border rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Key (e.g., INVITE_CODE)"
                        value={variable.key}
                        onChange={(e) =>
                          updateVariable(index, { key: e.target.value })
                        }
                      />
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={variable.type}
                        onChange={(e) =>
                          updateVariable(index, {
                            type: e.target.value as "string" | "number",
                          })
                        }
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                      </select>
                      <Input
                        placeholder="Fallback value"
                        value={variable.fallbackValue}
                        onChange={(e) =>
                          updateVariable(index, {
                            fallbackValue:
                              variable.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariable(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish on save (create mode only) */}
          {mode === "create" && (
            <div className="flex items-center gap-2">
              <Switch
                id="publish"
                checked={publishOnSave}
                onCheckedChange={setPublishOnSave}
              />
              <Label htmlFor="publish">Publish template immediately</Label>
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border rounded-lg overflow-hidden h-fit sticky top-4">
            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
              <span className="text-sm font-medium">Preview</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-white">
              {html ? (
                <iframe
                  srcDoc={html}
                  className="w-full min-h-[500px] border-0"
                  title="Template Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Enter HTML to see preview
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Starter Templates */}
      {mode === "create" && !html && (
        <div className="mt-8">
          <h3 className="font-medium mb-4">Quick Start Templates</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => {
                setName("wedding-invitation");
                setSubject("You're Invited to Our Wedding! 💕");
                setHtml(WEDDING_INVITATION_TEMPLATE);
                // Pass all variables explicitly including name (Resend reserved vars only work with Audiences)
                setVariables([
                  { key: "FIRST_NAME", type: "string", fallbackValue: "Guest" },
                  { key: "LAST_NAME", type: "string", fallbackValue: "" },
                  {
                    key: "INVITE_CODE",
                    type: "string",
                    fallbackValue: "XXXXXX",
                  },
                  {
                    key: "RSVP_URL",
                    type: "string",
                    fallbackValue: "https://example.com/rsvp",
                  },
                  {
                    key: "APP_URL",
                    type: "string",
                    fallbackValue: "https://example.com",
                  },
                  {
                    key: "WEDDING_DATE",
                    type: "string",
                    fallbackValue: "Saturday, September 20, 2025",
                  },
                ]);
              }}
              className="p-4 border rounded-lg text-left hover:border-primary transition-colors"
            >
              <h4 className="font-medium mb-1">Wedding Invitation</h4>
              <p className="text-sm text-muted-foreground">
                Standard wedding invitation with RSVP link
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setName("event-invitation");
                setSubject("You're Invited to {{{EVENT_NAME}}}!");
                setHtml(EVENT_INVITATION_TEMPLATE);
                // Note: FIRST_NAME, LAST_NAME are reserved by Resend - only custom vars needed
                setVariables([
                  {
                    key: "EVENT_NAME",
                    type: "string",
                    fallbackValue: "Our Event",
                  },
                  {
                    key: "EVENT_DESCRIPTION",
                    type: "string",
                    fallbackValue: "",
                  },
                  { key: "EVENT_DATE", type: "string", fallbackValue: "" },
                  { key: "EVENT_TIME", type: "string", fallbackValue: "" },
                  { key: "LOCATION_NAME", type: "string", fallbackValue: "" },
                  {
                    key: "LOCATION_ADDRESS",
                    type: "string",
                    fallbackValue: "",
                  },
                  {
                    key: "INVITE_CODE",
                    type: "string",
                    fallbackValue: "XXXXXX",
                  },
                  {
                    key: "RSVP_URL",
                    type: "string",
                    fallbackValue: "https://example.com/rsvp",
                  },
                  {
                    key: "APP_URL",
                    type: "string",
                    fallbackValue: "https://example.com",
                  },
                ]);
              }}
              className="p-4 border rounded-lg text-left hover:border-primary transition-colors"
            >
              <h4 className="font-medium mb-1">Event Invitation</h4>
              <p className="text-sm text-muted-foreground">
                Customizable event invitation template
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setName("rsvp-reminder");
                setSubject("Reminder: Please RSVP for Our Wedding");
                setHtml(REMINDER_TEMPLATE);
                // Note: FIRST_NAME is reserved by Resend - only custom vars needed
                setVariables([
                  {
                    key: "INVITE_CODE",
                    type: "string",
                    fallbackValue: "XXXXXX",
                  },
                  {
                    key: "RSVP_URL",
                    type: "string",
                    fallbackValue: "https://example.com/rsvp",
                  },
                  { key: "DEADLINE", type: "string", fallbackValue: "TBD" },
                ]);
              }}
              className="p-4 border rounded-lg text-left hover:border-primary transition-colors"
            >
              <h4 className="font-medium mb-1">RSVP Reminder</h4>
              <p className="text-sm text-muted-foreground">
                Gentle reminder for guests who haven't RSVP'd
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setName("rsvp-notification");
                setSubject("{{{STATUS_EMOJI}}} New RSVP: {{{GUEST_NAMES}}}");
                setHtml(RSVP_NOTIFICATION_TEMPLATE);
                // Admin notification - uses custom vars for dynamic content
                setVariables([
                  { key: "STATUS_EMOJI", type: "string", fallbackValue: "✅" },
                  {
                    key: "STATUS_TEXT",
                    type: "string",
                    fallbackValue: "Attending",
                  },
                  {
                    key: "STATUS_COLOR",
                    type: "string",
                    fallbackValue: "#48bb78",
                  },
                  {
                    key: "GUEST_NAMES",
                    type: "string",
                    fallbackValue: "Guest Name",
                  },
                  { key: "GUEST_EMAILS", type: "string", fallbackValue: "" },
                  {
                    key: "INVITE_CODE",
                    type: "string",
                    fallbackValue: "XXXXXX",
                  },
                  { key: "SUBMITTED_AT", type: "string", fallbackValue: "" },
                  {
                    key: "DIETARY_RESTRICTIONS",
                    type: "string",
                    fallbackValue: "",
                  },
                  { key: "GUEST_COUNT", type: "number", fallbackValue: 1 },
                  {
                    key: "GUEST_COUNT_TEXT",
                    type: "string",
                    fallbackValue: "1 guest",
                  },
                  {
                    key: "CONFIRMATION_TEXT",
                    type: "string",
                    fallbackValue: "confirmed",
                  },
                ]);
              }}
              className="p-4 border rounded-lg text-left hover:border-primary transition-colors"
            >
              <h4 className="font-medium mb-1">RSVP Notification (Admin)</h4>
              <p className="text-sm text-muted-foreground">
                Admin notification when guest submits RSVP
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setName("event-rsvp-notification");
                setSubject(
                  "{{{STATUS_EMOJI}}} Event RSVP: {{{GUEST_NAME}}} - {{{EVENT_NAME}}}",
                );
                setHtml(EVENT_RSVP_NOTIFICATION_TEMPLATE);
                // Admin notification for event RSVPs
                setVariables([
                  { key: "STATUS_EMOJI", type: "string", fallbackValue: "✅" },
                  {
                    key: "STATUS_TEXT",
                    type: "string",
                    fallbackValue: "Attending",
                  },
                  {
                    key: "STATUS_COLOR",
                    type: "string",
                    fallbackValue: "#48bb78",
                  },
                  {
                    key: "GUEST_NAME",
                    type: "string",
                    fallbackValue: "Guest Name",
                  },
                  { key: "GUEST_EMAIL", type: "string", fallbackValue: "" },
                  {
                    key: "EVENT_NAME",
                    type: "string",
                    fallbackValue: "Event Name",
                  },
                  {
                    key: "INVITE_CODE",
                    type: "string",
                    fallbackValue: "XXXXXX",
                  },
                  { key: "SUBMITTED_AT", type: "string", fallbackValue: "" },
                  {
                    key: "CONFIRMATION_TEXT",
                    type: "string",
                    fallbackValue: "confirmed attendance",
                  },
                  {
                    key: "SUMMARY_BG_COLOR",
                    type: "string",
                    fallbackValue: "#f0fff4",
                  },
                  {
                    key: "SUMMARY_BORDER_COLOR",
                    type: "string",
                    fallbackValue: "#68d391",
                  },
                  {
                    key: "SUMMARY_TEXT_COLOR",
                    type: "string",
                    fallbackValue: "#276749",
                  },
                ]);
              }}
              className="p-4 border rounded-lg text-left hover:border-primary transition-colors"
            >
              <h4 className="font-medium mb-1">
                Event RSVP Notification (Admin)
              </h4>
              <p className="text-sm text-muted-foreground">
                Admin notification when guest responds to event invite
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Wedding Invitation - matches lib/email/templates/wedding-invitation.tsx
const WEDDING_INVITATION_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wedding Invitation - Helen & Enrique</title>
    <style>
      .copy-code:hover {
        cursor: pointer;
        transform: scale(1.02);
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section with Background Image -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%), url({{{APP_URL}}}/our-photos/la-jolla.jpeg) center/cover; padding: 80px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 48px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              You're Invited
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              Helen & Enrique
            </p>
            <p style="margin: 15px 0 0; color: rgba(255,255,255,0.98); font-size: 16px; font-weight: 300; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
              Join us in celebrating our special day
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{FIRST_NAME}}} {{{LAST_NAME}}},
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          We're thrilled to invite you to our wedding celebration! Your presence would mean the world to us as we begin this new chapter together in beautiful San Diego.
        </p>

        <!-- Invitation Code Card -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; margin: 40px 0; border-radius: 12px; box-shadow: 0 8px 30px rgba(102, 126, 234, 0.3); text-align: center;">
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
            Your Personal Invitation Code
          </p>
          <div style="margin: 20px 0;">
            <div style="display: inline-block; background: #ffffff; padding: 20px 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
              <span style="font-size: 38px; font-weight: 800; color: #667eea; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">
                {{{INVITE_CODE}}}
              </span>
            </div>
          </div>
          <p style="margin: 15px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.6;">
            Click the code above to copy, or use the RSVP button below
          </p>
        </div>

        <!-- RSVP Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a
            href="{{{RSVP_URL}}}"
            style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);"
          >
            RSVP Now
          </a>
        </div>

        <!-- Event Details -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
          <p style="margin: 0 0 10px; color: #2d3748; font-size: 18px; font-weight: 600;">
            📅 {{{WEDDING_DATE}}}
          </p>
          <p style="margin: 0 0 10px; color: #2d3748; font-size: 15px; font-weight: 600;">
            📍 San Diego, California
          </p>
          <p style="margin: 0; color: #718096; font-size: 14px;">
            Full details and schedule available after RSVP
          </p>
        </div>

        <!-- Alternative Instructions -->
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 40px 0;">
          <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; font-weight: 600;">
            ⚠️ If the button doesn't work:
          </p>
          <ol style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Copy your invitation code above</li>
            <li style="margin-bottom: 8px;">Visit <a href="{{{APP_URL}}}/rsvp" style="color: #667eea; text-decoration: none; font-weight: 600;">{{{APP_URL}}}/rsvp</a></li>
            <li>Enter your code manually on the RSVP page</li>
          </ol>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          Direct RSVP link (copy if button doesn't work):<br>
          <a href="{{{RSVP_URL}}}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">{{{RSVP_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          We can't wait to celebrate with you! 💕
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          If you have any questions, please don't hesitate to reach out.
        </p>
      </div>
    </div>
  </body>
</html>`;

// Event Invitation - matches lib/email/templates/event-invitation.tsx
const EVENT_INVITATION_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{{EVENT_NAME}}} - Helen & Enrique</title>
    <style>
      .copy-code:hover {
        cursor: pointer;
        transform: scale(1.02);
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section with Background Image -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%), url({{{APP_URL}}}/our-photos/la-jolla.jpeg) center/cover; padding: 80px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 36px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              You're Invited
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 400; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{EVENT_NAME}}}
            </p>
            <p style="margin: 15px 0 0; color: rgba(255,255,255,0.98); font-size: 16px; font-weight: 300; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
              Hosted by Helen & Enrique
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{FIRST_NAME}}} {{{LAST_NAME}}},
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          {{{EVENT_DESCRIPTION}}}
        </p>

        <!-- Event Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Event Details
          </p>

          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">📅</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_DATE}}}</span>
          </div>

          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">🕐</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_TIME}}}</span>
          </div>

          <div style="margin: 0 0 5px;">
            <span style="color: #667eea; font-size: 16px;">📍</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{LOCATION_NAME}}}</span>
          </div>

          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{LOCATION_ADDRESS}}}</span>
          </div>
        </div>

        <!-- Invitation Code Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
          <p style="margin: 0 0 15px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Your Invitation Code
          </p>
          <div style="margin: 0 0 15px;">
            <span style="display: inline-block; background: #ffffff; padding: 14px 24px; border-radius: 8px; font-size: 28px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              {{{INVITE_CODE}}}
            </span>
          </div>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Use this to RSVP
          </p>
        </div>

        <!-- RSVP Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a
            href="{{{RSVP_URL}}}"
            style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);"
          >
            RSVP Now
          </a>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          If the button doesn't work, copy this link:<br>
          <a href="{{{RSVP_URL}}}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">{{{RSVP_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          We hope to see you there!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          Helen & Enrique
        </p>
      </div>
    </div>
  </body>
</html>`;

const REMINDER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Friendly Reminder</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear {{{FIRST_NAME}}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We noticed you haven't RSVP'd yet for our wedding. We'd love to know if you can make it!
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                <strong>Please respond by {{{DEADLINE}}}</strong> so we can finalize our arrangements.
              </p>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">Your Invite Code</p>
                <p style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 2px;">{{{INVITE_CODE}}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">RSVP Now</a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Thank you for letting us know!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// RSVP Notification (Admin) - matches lib/email/templates/rsvp-notification.tsx
const RSVP_NOTIFICATION_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New RSVP Submission</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          {{{STATUS_EMOJI}}} New RSVP Submission
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: {{{STATUS_COLOR}}}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
            {{{STATUS_TEXT}}}
          </span>
        </div>

        <!-- Guest Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Guest(s)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GUEST_NAMES}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email(s)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{GUEST_EMAILS}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invite Code</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">{{{INVITE_CODE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted At</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Dietary Restrictions (if any) -->
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
            🍽️ Dietary Restrictions
          </p>
          <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
            {{{DIETARY_RESTRICTIONS}}}
          </p>
        </div>

        <!-- Guest Count Summary -->
        <div style="background: #f0fff4; border: 1px solid #68d391; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #276749; font-size: 14px;">
            {{{GUEST_COUNT_TEXT}}} {{{CONFIRMATION_TEXT}}}
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          This is an automated notification from your wedding website.
        </p>
      </div>
    </div>
  </body>
</html>`;

// Event RSVP Notification (Admin) - matches lib/email/templates/event-rsvp-notification.tsx
const EVENT_RSVP_NOTIFICATION_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event RSVP - {{{EVENT_NAME}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 24px; font-weight: 600;">
          {{{STATUS_EMOJI}}} Event RSVP Response
        </h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">
          {{{EVENT_NAME}}}
        </p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: {{{STATUS_COLOR}}}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
            {{{STATUS_TEXT}}}
          </span>
        </div>

        <!-- Guest Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Guest</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GUEST_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{GUEST_EMAIL}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Event</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 16px; font-weight: 500;">{{{EVENT_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invite Code</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">{{{INVITE_CODE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted At</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Response Summary -->
        <div style="background: {{{SUMMARY_BG_COLOR}}}; border: 1px solid {{{SUMMARY_BORDER_COLOR}}}; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: {{{SUMMARY_TEXT_COLOR}}}; font-size: 14px;">
            Guest has {{{CONFIRMATION_TEXT}}} for {{{EVENT_NAME}}}
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          This is an automated notification from your wedding website.
        </p>
      </div>
    </div>
  </body>
</html>`;
