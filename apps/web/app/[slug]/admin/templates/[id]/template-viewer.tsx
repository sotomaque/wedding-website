"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { ArrowLeft, Copy, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { Template } from "@/lib/templates/fetch-templates";

interface TemplateViewerProps {
  template: Template;
}

const TYPE_LABELS: Record<string, string> = {
  wedding_invitation: "Wedding Invitation",
  rsvp_notification: "RSVP Notification",
  gift_notification: "Gift Notification",
  activities_invitation: "Activities Invitation",
  event_invitation: "Event Invitation",
  event_rsvp_notification: "Event RSVP Notification",
  hotel_interest_notification: "Hotel Interest Notification",
  calendar_invite: "Calendar Invite",
  rsvp_confirmation: "RSVP Confirmation",
  gift_thank_you: "Gift Thank You",
};

export function TemplateViewer({ template }: TemplateViewerProps) {
  const slug = useWeddingSlug();
  const [isActive, setIsActive] = useState(template.isActive);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggleActive(checked: boolean) {
    setIsToggling(true);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: checked }),
      });

      if (!response.ok) throw new Error("Failed to update template");

      setIsActive(checked);
      toast.success(checked ? "Template enabled" : "Template disabled");
    } catch (error) {
      console.error("Error toggling template:", error);
      toast.error("Failed to update template");
    } finally {
      setIsToggling(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link
        href={`/${slug}/admin/templates`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <Badge variant="secondary">
              {TYPE_LABELS[template.type] || template.type}
            </Badge>
            {!isActive && (
              <Badge variant="outline" className="text-muted-foreground">
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-2">
            Subject: {template.subject}
          </p>
          <p className="text-sm text-muted-foreground">
            Created: {formatDate(template.createdAt)}
            {template.updatedAt !== template.createdAt && (
              <> | Updated: {formatDate(template.updatedAt)}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleActive}
                aria-label="Toggle template active"
              />
            )}
            <span className="text-sm text-muted-foreground">
              {isActive ? "Active" : "Disabled"}
            </span>
          </div>
          <Link href={`/${slug}/admin/templates/${template.id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Variables */}
      {template.variables.length > 0 && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Available Variables</p>
          <div className="flex flex-wrap gap-2">
            {template.variables.map((variable) => (
              <code
                key={variable.key}
                className="text-xs bg-background px-2 py-1 rounded border"
              >
                {`{{{${variable.key}}}}`}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="p-4 bg-white">
          {template.htmlBody ? (
            <iframe
              srcDoc={template.htmlBody}
              className="w-full min-h-[600px] border-0"
              title="Template Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No HTML content available
            </p>
          )}
        </div>
      </div>

      {/* HTML Source */}
      {template.htmlBody && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
            <span className="text-sm font-medium">HTML Source</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(template.htmlBody || "");
                toast.success("HTML copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
          <pre className="p-4 bg-background overflow-x-auto text-xs">
            <code>{template.htmlBody}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
