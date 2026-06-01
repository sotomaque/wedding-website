"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { Eye, Globe, Info, Loader2, Pencil, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
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
  rsvp_reminder: "RSVP Reminder",
  admin_summary: "Admin Summary",
  rsvp_confirmation: "RSVP Confirmation",
  gift_thank_you: "Gift Thank You",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
};

interface TemplatesClientProps {
  initialTemplates: Template[];
  defaultLanguage: "en" | "es";
  slug: string;
}

export function TemplatesClient({
  initialTemplates,
  defaultLanguage,
  slug,
}: TemplatesClientProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<"en" | "es">(
    defaultLanguage,
  );

  const filteredTemplates = templates.filter(
    (t) => t.language === languageFilter,
  );
  const isDefaultLang = languageFilter === defaultLanguage;

  async function handleToggleActive(templateId: string, isActive: boolean) {
    setTogglingId(templateId);
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) throw new Error("Failed to update template");

      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, isActive } : t)),
      );
      toast.success(isActive ? "Template enabled" : "Template disabled");
    } catch (error) {
      console.error("Error toggling template:", error);
      toast.error("Failed to update template");
    } finally {
      setTogglingId(null);
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Email Templates</h1>
        <p className="text-muted-foreground">
          Manage your wedding email templates. Toggle templates on or off, and
          customize their content.
        </p>
      </div>

      {/* Language context banner */}
      <div className="mb-6 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p>
              Your wedding&apos;s default language is{" "}
              <strong>{LANGUAGE_LABELS[defaultLanguage]}</strong>.{" "}
              {isDefaultLang ? (
                <>
                  These templates will be used for all guests unless a guest has
                  a different preferred language set.
                </>
              ) : (
                <>
                  These templates will only be used for guests whose preferred
                  language is set to{" "}
                  <strong>{LANGUAGE_LABELS[languageFilter]}</strong> in their
                  guest profile.
                </>
              )}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link
                href={`/${slug}/admin/settings`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Settings className="h-3 w-3" />
                Change default language
              </Link>
              <span className="text-muted-foreground/50">|</span>
              <Link
                href={`/${slug}/admin/guests`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Set guest language preferences
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Language Filter */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-muted-foreground">Viewing:</span>
        {(["en", "es"] as const).map((lang) => (
          <Button
            key={lang}
            variant={languageFilter === lang ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguageFilter(lang)}
            className="gap-1.5"
          >
            {LANGUAGE_LABELS[lang]}
            {lang === defaultLanguage && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                default
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed">
          <h3 className="text-lg font-medium mb-2">
            No {LANGUAGE_LABELS[languageFilter]} templates found
          </h3>
          <p className="text-muted-foreground">
            Templates are automatically created when your wedding is set up.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{template.name}</h3>
                  <Badge variant="secondary">
                    {TYPE_LABELS[template.type] || template.type}
                  </Badge>
                  {!template.isActive && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mb-1">
                  Subject: {template.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated: {formatDate(template.updatedAt)}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-2">
                  {togglingId === template.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleActive(template.id, checked)
                      }
                      aria-label={`Toggle ${template.name}`}
                    />
                  )}
                </div>
                <Link href={`/${slug}/admin/templates/${template.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/${slug}/admin/templates/${template.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works section */}
      <div className="mt-8 space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">
              <h4 className="font-medium mb-1">How language selection works</h4>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Emails are sent in each guest&apos;s preferred language (set
                  in their guest profile)
                </li>
                <li>
                  If a guest has no preferred language, the wedding&apos;s
                  default language ({LANGUAGE_LABELS[defaultLanguage]}) is used
                </li>
                <li>
                  Toggle a template off to prevent that type of email from being
                  sent entirely
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">Template Variables</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Use triple curly braces for variables in your templates:
          </p>
          <code className="text-xs bg-background px-2 py-1 rounded">
            {"Hello {{{FIRST_NAME}}}, your code is {{{INVITE_CODE}}}"}
          </code>
          <p className="text-sm text-muted-foreground mt-3">
            Each template has its own set of available variables listed on its
            edit page.
          </p>
        </div>
      </div>
    </div>
  );
}
