"use client";

import type { Wedding, WeddingAdmin } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { locales } from "@/i18n/config";
import { TIMEZONES } from "@/lib/constants/timezones";
import { FONT_PAIRINGS } from "@/lib/fonts";
import { TEMPLATE_PRESETS } from "@/lib/templates";
import { getThemePreset, THEME_PRESETS } from "@/lib/themes";
import {
  designConfigSchema,
  featureTogglesSchema,
} from "@/lib/validations/wedding-content";
import {
  inviteAdmin,
  removeAdmin,
  updateBrandingSettings,
  updateDefaultLanguage,
  updateFeatureToggles,
  updateFont,
  updateGeneralSettings,
  updateNotificationSettings,
  updateTemplate,
  updateTheme,
} from "./actions";

type Tab = "general" | "appearance" | "notifications" | "features" | "team";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "appearance", label: "Appearance" },
  { key: "notifications", label: "Notifications" },
  { key: "features", label: "Features" },
  { key: "team", label: "Team" },
];

const FEATURE_LABELS: Record<string, string> = {
  hotels: "Hotels",
  vendors: "Vendors",
  thingsToDo: "Things to Do",
  tripPlanner: "Trip Planner",
  registry: "Registry",
  guestPhotos: "Guest Photos",
  slideshow: "Slideshow",
};

function formatDateForInput(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0] ?? "";
}

interface ReminderSchedule {
  id: string;
  daysBeforeDeadline: number;
  isEnabled: boolean;
  lastRunAt: string | null;
}

interface AdminSummaryConfig {
  id: string;
  isEnabled: boolean;
  frequencyDays: number;
  lastRunAt: string | null;
}

interface SettingsClientProps {
  wedding: Wedding;
  admins: WeddingAdmin[];
  reminderSchedules: ReminderSchedule[];
  adminSummaryConfig: AdminSummaryConfig | null;
}

export function SettingsClient({
  wedding,
  admins,
  reminderSchedules: initialReminders,
  adminSummaryConfig: initialSummaryConfig,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-6">Settings</h1>

      <div className="flex gap-2 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-10">
          <GeneralSection wedding={wedding} />
          <SettingsSubsection title="Language">
            <LanguageSection wedding={wedding} />
          </SettingsSubsection>
        </div>
      )}
      {activeTab === "appearance" && (
        <div className="space-y-10">
          <SettingsSubsection title="Template">
            <TemplateSection wedding={wedding} />
          </SettingsSubsection>
          <SettingsSubsection title="Color theme">
            <ThemeSection wedding={wedding} />
          </SettingsSubsection>
          <SettingsSubsection title="Typography">
            <TypographySection wedding={wedding} />
          </SettingsSubsection>
          <SettingsSubsection title="Logo">
            <BrandingSection wedding={wedding} />
          </SettingsSubsection>
        </div>
      )}
      {activeTab === "notifications" && (
        <div className="space-y-10">
          <NotificationsSection wedding={wedding} />
          <SettingsSubsection title="Automated emails">
            <AutomatedEmailsSection
              reminderSchedules={initialReminders}
              adminSummaryConfig={initialSummaryConfig}
            />
          </SettingsSubsection>
        </div>
      )}
      {activeTab === "features" && <FeaturesSection wedding={wedding} />}
      {activeTab === "team" && <AdminsSection admins={admins} />}
    </div>
  );
}

/**
 * Visual divider + heading for grouping multiple section components under
 * one tab. Keeps tab-internal navigation scannable without nesting tabs.
 */
function SettingsSubsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-medium mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  );
}

function GeneralSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const [coupleName, setCoupleName] = useState(wedding.coupleName);
  const [person1Name, setPerson1Name] = useState(wedding.person1Name ?? "");
  const [person2Name, setPerson2Name] = useState(wedding.person2Name ?? "");
  const [weddingDate, setWeddingDate] = useState(
    formatDateForInput(wedding.weddingDate),
  );
  const [timezone, setTimezone] = useState(wedding.timezone);
  const [rsvpDeadline, setRsvpDeadline] = useState(wedding.rsvpDeadline ?? "");
  const [status, setStatus] = useState(wedding.status);

  function handleSave() {
    startTransition(async () => {
      const result = await updateGeneralSettings({
        coupleName,
        person1Name,
        person2Name,
        weddingDate,
        timezone,
        rsvpDeadline: rsvpDeadline || undefined,
        status,
      });
      if (result.success) {
        toast.success("General settings saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="slug">Slug (read-only)</Label>
        <Input id="slug" value={wedding.slug} disabled className="mt-1" />
      </div>
      <div>
        <Label htmlFor="coupleName">Couple Name</Label>
        <Input
          id="coupleName"
          value={coupleName}
          onChange={(e) => setCoupleName(e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="person1Name">Person 1 Name</Label>
          <Input
            id="person1Name"
            value={person1Name}
            onChange={(e) => setPerson1Name(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="person2Name">Person 2 Name</Label>
          <Input
            id="person2Name"
            value={person2Name}
            onChange={(e) => setPerson2Name(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
        <label className="text-sm font-medium">Wedding Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "mt-1 w-full justify-start text-left font-normal",
                !weddingDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {weddingDate
                ? format(new Date(`${weddingDate}T00:00:00`), "MMMM d, yyyy")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                weddingDate ? new Date(`${weddingDate}T00:00:00`) : undefined
              }
              onSelect={(date) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setWeddingDate(`${yyyy}-${mm}-${dd}`);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
        <label className="text-sm font-medium">RSVP Deadline</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "mt-1 w-full justify-start text-left font-normal",
                !rsvpDeadline && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {rsvpDeadline || "Pick a deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                rsvpDeadline
                  ? (() => {
                      const parsed = new Date(rsvpDeadline);
                      return Number.isNaN(parsed.getTime())
                        ? undefined
                        : parsed;
                    })()
                  : undefined
              }
              onSelect={(date) => {
                if (date) {
                  setRsvpDeadline(format(date, "MMMM d, yyyy"));
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1">
          Displayed as-is on the RSVP page (e.g. &quot;Please respond by March
          30, 2026&quot;)
        </p>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save General Settings"}
      </Button>
    </div>
  );
}

function NotificationsSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const [contactEmail, setContactEmail] = useState(wedding.contactEmail ?? "");
  const [notificationEmails, setNotificationEmails] = useState(
    wedding.notificationEmails ?? "",
  );
  const [emailFromName, setEmailFromName] = useState(
    wedding.emailFromName ?? "",
  );
  const [emailFromAddress, setEmailFromAddress] = useState(
    wedding.emailFromAddress ?? "",
  );

  function handleSave() {
    startTransition(async () => {
      const result = await updateNotificationSettings({
        contactEmail,
        notificationEmails,
        emailFromName,
        emailFromAddress,
      });
      if (result.success) {
        toast.success("Notification settings saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="contactEmail">Contact Email</Label>
        <Input
          id="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="notificationEmails">
          Notification Emails (comma-separated)
        </Label>
        <Input
          id="notificationEmails"
          value={notificationEmails}
          onChange={(e) => setNotificationEmails(e.target.value)}
          placeholder="admin@example.com, partner@example.com"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="emailFromName">Email From Name</Label>
        <Input
          id="emailFromName"
          value={emailFromName}
          onChange={(e) => setEmailFromName(e.target.value)}
          placeholder="The Wedding of ..."
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="emailFromAddress">Email From Address</Label>
        <Input
          id="emailFromAddress"
          type="email"
          value={emailFromAddress}
          onChange={(e) => setEmailFromAddress(e.target.value)}
          placeholder="noreply@yourdomain.com"
          className="mt-1"
        />
      </div>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Notification Settings"}
      </Button>
    </div>
  );
}

function BrandingSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const [brandImageUrl, setBrandImageUrl] = useState(
    wedding.brandImageUrl ?? "",
  );
  const [brandImageAlt, setBrandImageAlt] = useState(
    wedding.brandImageAlt ?? "",
  );

  function handleSave() {
    startTransition(async () => {
      const result = await updateBrandingSettings({
        brandImageUrl,
        brandImageAlt,
      });
      if (result.success) {
        toast.success("Branding settings saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="brandImageUrl">Brand Image URL</Label>
        <Input
          id="brandImageUrl"
          value={brandImageUrl}
          onChange={(e) => setBrandImageUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="brandImageAlt">Brand Image Alt Text</Label>
        <Input
          id="brandImageAlt"
          value={brandImageAlt}
          onChange={(e) => setBrandImageAlt(e.target.value)}
          placeholder="Our wedding logo"
          className="mt-1"
        />
      </div>
      {brandImageUrl && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          {/* biome-ignore lint/performance/noImgElement: dynamic brand image URL, not optimizable by next/image */}
          <img
            src={brandImageUrl}
            alt={brandImageAlt || "Brand image preview"}
            className="max-h-32 rounded border border-border"
          />
        </div>
      )}
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Branding Settings"}
      </Button>
    </div>
  );
}

function ThemeSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentThemeId = (wedding.themeId as string) ?? "warm-gold";

  function handleSelect(themeId: string) {
    startTransition(async () => {
      const result = await updateTheme(themeId);
      if (result.success) {
        toast.success("Theme updated");
      } else {
        toast.error(result.error ?? "Failed to update theme");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Choose a color theme for your wedding site. The theme affects all
        public-facing pages.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEME_PRESETS.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => handleSelect(theme.id)}
            disabled={isPending}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              currentThemeId === theme.id
                ? "border-accent shadow-md"
                : "border-border hover:border-accent/40"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: theme.preview.background }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: theme.preview.primary }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </div>
              {currentThemeId === theme.id && (
                <span className="text-xs font-medium text-accent">Active</span>
              )}
            </div>
            <p className="text-sm font-medium">{theme.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {theme.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypographySection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const design = designConfigSchema.parse(wedding.designConfig ?? {});
  const currentFontId = design.fontId ?? "classic";

  function handleSelect(fontId: string) {
    startTransition(async () => {
      const result = await updateFont(fontId);
      if (result.success) {
        toast.success("Font updated");
      } else {
        toast.error(result.error ?? "Failed to update font");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Choose a font pairing for your wedding site. Headings and body text
        update across all public-facing pages.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FONT_PAIRINGS.map((font) => (
          <button
            key={font.id}
            type="button"
            onClick={() => handleSelect(font.id)}
            disabled={isPending}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              currentFontId === font.id
                ? "border-accent shadow-md"
                : "border-border hover:border-accent/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{font.name}</p>
              {currentFontId === font.id && (
                <span className="text-xs font-medium text-accent">Active</span>
              )}
            </div>
            <p
              className="text-xl leading-tight"
              style={{ fontFamily: font.preview.heading }}
            >
              Aa
            </p>
            <p
              className="text-sm mt-1"
              style={{ fontFamily: font.preview.body }}
            >
              The quick brown fox
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {font.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Top-level Appearance control. A template bundles layout + motif +
 * default theme + default font into one pickable unit. Picking a template
 * sets only `Wedding.templateId`; any custom color theme / font pairing the
 * user has selected is preserved (additive — see actions.ts `updateTemplate`).
 */
function TemplateSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentTemplateId = wedding.templateId ?? "classic";

  function handleSelect(templateId: string) {
    startTransition(async () => {
      const result = await updateTemplate(templateId);
      if (result.success) {
        toast.success("Template updated");
      } else {
        toast.error(result.error ?? "Failed to update template");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Pick a template to set the overall look of your wedding site — section
        order, decorative dividers, and the default colors and fonts. After
        picking a template you can fine-tune the color theme and typography
        below; your customizations are preserved if you switch templates later.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATE_PRESETS.map((template) => {
          const defaultTheme = getThemePreset(template.defaultThemeId);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template.id)}
              disabled={isPending}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                currentTemplateId === template.id
                  ? "border-accent shadow-md"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">{template.name}</p>
                {currentTemplateId === template.id && (
                  <span className="text-xs font-medium text-accent">
                    Active
                  </span>
                )}
              </div>
              <div className="flex gap-1 mb-3">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{
                    backgroundColor: defaultTheme.preview.background,
                  }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: defaultTheme.preview.primary }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: defaultTheme.preview.accent }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español (Spanish)",
};

function LanguageSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentLanguage = wedding.defaultLanguage ?? "en";

  function handleSelect(language: string) {
    startTransition(async () => {
      const result = await updateDefaultLanguage(language);
      if (result.success) {
        toast.success("Default language updated");
      } else {
        toast.error(result.error ?? "Failed to update language");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Choose the default language for your wedding site. Guests can switch
        languages using the language switcher in the footer.
      </p>
      <div>
        <Label htmlFor="defaultLanguage">Default Language</Label>
        <select
          id="defaultLanguage"
          value={currentLanguage}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={isPending}
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {LANGUAGE_LABELS[locale] ?? locale}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          This sets the language shown when guests first visit your site. They
          can switch to another language at any time.
        </p>
      </div>
    </div>
  );
}

function FeaturesSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  // Parse the JSON blob via the same schema the rest of the app uses, so
  // unknown keys are stripped and missing ones get their declared defaults
  // instead of trusting an unchecked `as Record<string, boolean>` cast.
  const initialToggles = featureTogglesSchema.parse(
    wedding.featureToggles ?? {},
  ) as Record<string, boolean>;
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const key of Object.keys(FEATURE_LABELS)) {
      defaults[key] = initialToggles[key] ?? true;
    }
    return defaults;
  });

  function handleToggle(key: string, checked: boolean) {
    setToggles((prev) => ({ ...prev, [key]: checked }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateFeatureToggles(toggles);
      if (result.success) {
        toast.success("Feature toggles saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Toggle features on or off for your wedding site.
      </p>
      {Object.entries(FEATURE_LABELS).map(([key, label]) => (
        <div
          key={key}
          className="flex items-center justify-between py-2 border-b border-border last:border-0"
        >
          <Label htmlFor={`feature-${key}`} className="cursor-pointer">
            {label}
          </Label>
          <Switch
            id={`feature-${key}`}
            checked={toggles[key] ?? true}
            onCheckedChange={(checked) => handleToggle(key, checked)}
          />
        </div>
      ))}
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Feature Toggles"}
      </Button>
    </div>
  );
}

function AdminsSection({ admins }: { admins: WeddingAdmin[] }) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("owner");

  function handleInvite() {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    startTransition(async () => {
      const result = await inviteAdmin({ email, role });
      if (result.success) {
        toast.success("Admin invited successfully");
        setEmail("");
        setRole("owner");
      } else {
        toast.error(result.error ?? "Failed to invite admin");
      }
    });
  }

  function handleRemove(adminId: string) {
    startTransition(async () => {
      const result = await removeAdmin(adminId);
      if (result.success) {
        toast.success("Admin removed");
      } else {
        toast.error(result.error ?? "Failed to remove admin");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Manage who has admin access to your wedding dashboard.
      </p>

      {/* Current admins list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Current Admins</h3>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{admin.email}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        admin.role === "owner"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      }`}
                    >
                      {admin.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Added{" "}
                      {new Date(admin.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(admin.id)}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="space-y-4 rounded-md border border-border p-4">
        <h3 className="text-sm font-medium">Invite Admin</h3>
        <div>
          <Label htmlFor="adminEmail">Email</Label>
          <Input
            id="adminEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@example.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="adminRole">Role</Label>
          <select
            id="adminRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Owners can manage admins and all settings. Editors can manage
            content only.
          </p>
        </div>
        <Button onClick={handleInvite} disabled={isPending}>
          {isPending ? "Inviting..." : "Invite Admin"}
        </Button>
      </div>
    </div>
  );
}

function AutomatedEmailsSection({
  reminderSchedules: initialReminders,
  adminSummaryConfig: initialConfig,
}: {
  reminderSchedules: ReminderSchedule[];
  adminSummaryConfig: AdminSummaryConfig | null;
}) {
  const [reminders, setReminders] = useState(initialReminders);
  const [summaryEnabled, setSummaryEnabled] = useState(
    initialConfig?.isEnabled ?? false,
  );
  const [summaryFrequency, setSummaryFrequency] = useState(
    String(initialConfig?.frequencyDays ?? 7),
  );
  const [newDays, setNewDays] = useState("");
  const [isPending, startTransition] = useTransition();

  function addReminder() {
    const days = Number.parseInt(newDays, 10);
    if (!days || days < 1) {
      toast.error("Enter a positive number of days");
      return;
    }

    if (reminders.some((r) => r.daysBeforeDeadline === days)) {
      toast.error("A reminder with this number of days already exists");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBeforeDeadline: days }),
      });
      const data = await res.json();
      if (res.ok) {
        setReminders((prev) =>
          [...prev, data.schedule].sort(
            (a: ReminderSchedule, b: ReminderSchedule) =>
              b.daysBeforeDeadline - a.daysBeforeDeadline,
          ),
        );
        setNewDays("");
        toast.success("Reminder added");
      } else {
        toast.error(data.error ?? "Failed to add reminder");
      }
    });
  }

  function toggleReminder(id: string, isEnabled: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/admin/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: [{ id, isEnabled }] }),
      });
      if (res.ok) {
        setReminders((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isEnabled } : r)),
        );
      } else {
        toast.error("Failed to update reminder");
      }
    });
  }

  function deleteReminder(id: string) {
    startTransition(async () => {
      const res = await fetch("/api/admin/reminders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        toast.success("Reminder removed");
      } else {
        toast.error("Failed to remove reminder");
      }
    });
  }

  function saveSummaryConfig() {
    startTransition(async () => {
      const res = await fetch("/api/admin/admin-summary-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: summaryEnabled,
          frequencyDays: Number.parseInt(summaryFrequency, 10),
        }),
      });
      if (res.ok) {
        toast.success("Admin summary settings saved");
      } else {
        toast.error("Failed to save admin summary settings");
      }
    });
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* RSVP Reminders */}
      <div>
        <h2 className="text-lg font-semibold mb-1">RSVP Reminders</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Automatically email guests who haven't responded. Reminders are sent
          based on how many days before your RSVP deadline.
        </p>

        {reminders.length > 0 && (
          <div className="space-y-3 mb-4">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={r.isEnabled}
                    onCheckedChange={(checked) => toggleReminder(r.id, checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm">
                    {r.daysBeforeDeadline} day
                    {r.daysBeforeDeadline !== 1 ? "s" : ""} before deadline
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteReminder(r.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            value={newDays}
            onChange={(e) => setNewDays(e.target.value)}
            placeholder="Days before deadline"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addReminder();
              }
            }}
          />
          <Button
            variant="outline"
            onClick={addReminder}
            disabled={isPending || !newDays}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Admin Summary */}
      <div className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-1">Admin Summary Email</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Receive a periodic summary of your A-list guest RSVP status, including
          who hasn't been invited yet.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="summary-enabled">Enable admin summary</Label>
            <Switch
              id="summary-enabled"
              checked={summaryEnabled}
              onCheckedChange={setSummaryEnabled}
              disabled={isPending}
            />
          </div>

          <div>
            <Label htmlFor="summary-frequency">Send every</Label>
            <Select
              value={summaryFrequency}
              onValueChange={setSummaryFrequency}
              disabled={isPending}
            >
              <SelectTrigger id="summary-frequency" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every day</SelectItem>
                <SelectItem value="3">Every 3 days</SelectItem>
                <SelectItem value="7">Every week</SelectItem>
                <SelectItem value="14">Every 2 weeks</SelectItem>
                <SelectItem value="30">Every month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={saveSummaryConfig} disabled={isPending}>
            {isPending ? "Saving..." : "Save Summary Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
