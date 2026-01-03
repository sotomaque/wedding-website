"use client";

import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, Copy, Loader2, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Template } from "@/lib/templates/fetch-templates";

interface TemplateViewerProps {
  template: Template;
}

export function TemplateViewer({ template }: TemplateViewerProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const response = await fetch(
        `/api/admin/templates/${template.id}/publish`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to publish template");

      toast.success("Template published");
      router.refresh();
    } catch (err) {
      console.error("Error publishing template:", err);
      toast.error("Failed to publish template");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const response = await fetch(
        `/api/admin/templates/${template.id}/duplicate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to duplicate template");

      const data = await response.json();
      toast.success("Template duplicated");
      router.push(`/admin/templates/${data.template.id}`);
    } catch (err) {
      console.error("Error duplicating template:", err);
      toast.error("Failed to duplicate template");
    } finally {
      setIsDuplicating(false);
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
        href="/admin/templates"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">{template.name}</h1>
          {template.subject && (
            <p className="text-muted-foreground mb-2">
              Subject: {template.subject}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Created: {formatDate(template.created_at)}
            {template.updated_at &&
              template.updated_at !== template.created_at && (
                <> | Updated: {formatDate(template.updated_at)}</>
              )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            {isDuplicating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Duplicate
          </Button>
          <Button
            variant="outline"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
          <Link href={`/admin/templates/${template.id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Template ID */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground mb-1">Template ID</p>
        <code className="text-sm font-mono">{template.id}</code>
      </div>

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="p-4 bg-white">
          {template.html ? (
            <iframe
              srcDoc={template.html}
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
      {template.html && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
            <span className="text-sm font-medium">HTML Source</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(template.html || "");
                toast.success("HTML copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
          <pre className="p-4 bg-background overflow-x-auto text-xs">
            <code>{template.html}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
