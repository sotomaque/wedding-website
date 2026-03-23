"use client";

import type { Wedding, WeddingAdmin } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TIMEZONES } from "@/lib/constants/timezones";
import { THEME_PRESETS } from "@/lib/themes";
import {
  inviteAdmin,
  removeAdmin,
  updateBrandingSettings,
  updateFeatureToggles,
  updateGeneralSettings,
  updateNotificationSettings,
  updateTheme,
} from "./actions";

type Tab =
  | "general"
  | "notifications"
  | "branding"
  | "theme"
  | "features"
  | "admins";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "notifications", label: "Notifications" },
  { key: "branding", label: "Branding" },
  { key: "theme", label: "Theme" },
  { key: "features", label: "Features" },
  { key: "admins", label: "Admins" },
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

interface SettingsClientProps {
  wedding: Wedding;
  admins: WeddingAdmin[];
}

export function SettingsClient({ wedding, admins }: SettingsClientProps) {
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

      {activeTab === "general" && <GeneralSection wedding={wedding} />}
      {activeTab === "notifications" && (
        <NotificationsSection wedding={wedding} />
      )}
      {activeTab === "branding" && <BrandingSection wedding={wedding} />}
      {activeTab === "theme" && <ThemeSection wedding={wedding} />}
      {activeTab === "features" && <FeaturesSection wedding={wedding} />}
      {activeTab === "admins" && <AdminsSection admins={admins} />}
    </div>
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
        <Label htmlFor="weddingDate">Wedding Date</Label>
        <Input
          id="weddingDate"
          type="date"
          value={weddingDate}
          onChange={(e) => setWeddingDate(e.target.value)}
          className="mt-1"
        />
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
        <Label htmlFor="rsvpDeadline">RSVP Deadline</Label>
        <Input
          id="rsvpDeadline"
          value={rsvpDeadline}
          onChange={(e) => setRsvpDeadline(e.target.value)}
          placeholder="e.g. March 15, 2026"
          className="mt-1"
        />
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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

function FeaturesSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const initialToggles = (wedding.featureToggles ?? {}) as Record<
    string,
    boolean
  >;
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
