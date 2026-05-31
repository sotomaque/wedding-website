"use client";

import type { Wedding, WeddingAdmin } from "@prisma/client";
import { useState } from "react";
import {
  BrandingSection,
  TemplateSection,
  ThemeSection,
  TypographySection,
} from "./sections/appearance-sections";
import { FeaturesSection } from "./sections/features-section";
import { GeneralSection, LanguageSection } from "./sections/general-section";
import { HeadcountSection } from "./sections/headcount-section";
import {
  AutomatedEmailsSection,
  NotificationsSection,
} from "./sections/notifications-sections";
import { AdminsSection } from "./sections/team-section";
import type { AdminSummaryConfig, ReminderSchedule } from "./sections/types";

type Tab =
  | "general"
  | "appearance"
  | "notifications"
  | "features"
  | "headcount"
  | "team";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "appearance", label: "Appearance" },
  { key: "notifications", label: "Notifications" },
  { key: "features", label: "Features" },
  { key: "headcount", label: "Headcount" },
  { key: "team", label: "Team" },
];

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
      {activeTab === "headcount" && <HeadcountSection wedding={wedding} />}
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
