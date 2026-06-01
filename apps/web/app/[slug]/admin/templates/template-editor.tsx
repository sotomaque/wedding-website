"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Eye, Info, Loader2, Save, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { Template } from "@/lib/templates/fetch-templates";

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

interface TemplateEditorProps {
  template: Template;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const slug = useWeddingSlug();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.htmlBody);
  const [isActive, setIsActive] = useState(template.isActive);

  // AI Email Draft state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiIntent, setAiIntent] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const handleGenerateDraft = useCallback(async () => {
    if (!aiIntent.trim()) {
      toast.error("Please describe what this email should say");
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const response = await fetch("/api/admin/ai/email-draft/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: template.type,
          intent: aiIntent,
          variables: template.variables.map((v) => ({
            key: v.key,
            description: v.description,
          })),
          currentSubject: subject || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate email draft");
      }

      setSubject(data.data.subject);
      setHtmlBody(data.data.htmlBody);
      setAiDialogOpen(false);
      setAiIntent("");
      toast.success("Email draft generated! Review and edit as needed.");
    } catch (error) {
      console.error("Error generating email draft:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate email draft",
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }, [aiIntent, template.type, template.variables, subject]);

  async function handleSave() {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!htmlBody.trim()) {
      toast.error("HTML body is required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          htmlBody: htmlBody.trim(),
          isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      toast.success("Template updated");
      router.push(`/${slug}/admin/templates/${template.id}`);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save template",
      );
    } finally {
      setIsSaving(false);
    }
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

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Edit Template</h1>
          <Badge variant="secondary">
            {TYPE_LABELS[template.type] || template.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Draft
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>AI Email Draft</DialogTitle>
                <DialogDescription>
                  Describe what this email should communicate and we will
                  generate a professional HTML email template.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-intent">
                    Describe what this email should say...
                  </Label>
                  <Textarea
                    id="ai-intent"
                    value={aiIntent}
                    onChange={(e) => setAiIntent(e.target.value)}
                    placeholder="A warm invitation to our wedding celebration with details about the ceremony and reception..."
                    className="min-h-37.5"
                    disabled={isGeneratingDraft}
                  />
                </div>
                {template.variables.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">
                      Available variables that will be included:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {template.variables.map((v) => (
                        <li key={v.key}>
                          <code>{`{{{${v.key}}}}`}</code>
                          {v.description ? ` - ${v.description}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft || !aiIntent.trim()}
                >
                  {isGeneratingDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            Save
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">
              {isActive ? "Template is active" : "Template is disabled"}
            </Label>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., You're Invited to Our Wedding!"
            />
          </div>

          {/* HTML Body */}
          <div className="space-y-2">
            <Label htmlFor="htmlBody">HTML Body *</Label>
            <Textarea
              id="htmlBody"
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="Enter your HTML email template..."
              className="font-mono text-sm min-h-[400px]"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{{"} VARIABLE_NAME {"}}}"} for dynamic content
            </p>
          </div>

          {/* Variables Reference Panel */}
          {template.variables.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Available Variables</span>
              </div>
              <div className="p-4 space-y-2">
                {template.variables.map((variable) => (
                  <div
                    key={variable.key}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {`{{{${variable.key}}}}`}
                      </code>
                      {variable.required && (
                        <Badge variant="destructive" className="text-[10px]">
                          Required
                        </Badge>
                      )}
                    </div>
                    {variable.description && (
                      <span className="text-xs text-muted-foreground">
                        {variable.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
              {htmlBody ? (
                <iframe
                  srcDoc={htmlBody}
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
    </div>
  );
}
