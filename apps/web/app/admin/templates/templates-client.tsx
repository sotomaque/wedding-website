"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Copy,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Template } from "@/lib/templates/fetch-templates";

interface TemplatesClientProps {
  initialTemplates: Template[];
}

export function TemplatesClient({ initialTemplates }: TemplatesClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTemplateId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/templates/${deleteTemplateId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted");
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTemplateId));
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
      setDeleteTemplateId(null);
    }
  }

  async function handleDuplicate(templateId: string) {
    setIsDuplicating(templateId);
    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/duplicate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to duplicate template");

      await response.json();
      toast.success("Template duplicated");
      router.refresh();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    } finally {
      setIsDuplicating(null);
    }
  }

  async function handlePublish(templateId: string) {
    setIsPublishing(templateId);
    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/publish`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to publish template");

      toast.success("Template published");
      router.refresh();
    } catch (error) {
      console.error("Error publishing template:", error);
      toast.error("Failed to publish template");
    } finally {
      setIsPublishing(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage your email templates stored in Resend
          </p>
        </div>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed">
          <h3 className="text-lg font-medium mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first email template to get started
          </p>
          <Link href="/admin/templates/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{template.name}</h3>
                </div>
                {template.subject && (
                  <p className="text-sm text-muted-foreground truncate mb-1">
                    Subject: {template.subject}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Created: {formatDate(template.created_at)}
                  {template.updated_at &&
                    template.updated_at !== template.created_at && (
                      <> | Updated: {formatDate(template.updated_at)}</>
                    )}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Link href={`/admin/templates/${template.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/admin/templates/${template.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDuplicate(template.id)}
                      disabled={isDuplicating === template.id}
                    >
                      {isDuplicating === template.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePublish(template.id)}
                      disabled={isPublishing === template.id}
                    >
                      {isPublishing === template.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Publish
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTemplateId(template.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Template Variables</h4>
        <p className="text-sm text-muted-foreground mb-2">
          Use triple curly braces for variables in your templates:
        </p>
        <code className="text-xs bg-background px-2 py-1 rounded">
          {"Hello {{{FIRST_NAME}}}, your code is {{{INVITE_CODE}}}"}
        </code>
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="font-medium mb-1">Common variables:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code className="text-xs">{"FIRST_NAME"}</code> - Guest's first
              name
            </li>
            <li>
              <code className="text-xs">{"LAST_NAME"}</code> - Guest's last name
            </li>
            <li>
              <code className="text-xs">{"INVITE_CODE"}</code> - Unique
              invitation code
            </li>
            <li>
              <code className="text-xs">{"RSVP_URL"}</code> - RSVP page URL
            </li>
            <li>
              <code className="text-xs">{"EVENT_NAME"}</code> - Event name
            </li>
            <li>
              <code className="text-xs">{"EVENT_DATE"}</code> - Event date
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
