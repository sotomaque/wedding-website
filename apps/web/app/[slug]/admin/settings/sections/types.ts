// Shared prop types for the settings sections, used by both the orchestrator
// (SettingsClient) and the notifications section.

export interface ReminderSchedule {
  id: string;
  daysBeforeDeadline: number;
  isEnabled: boolean;
  lastRunAt: string | null;
}

export interface AdminSummaryConfig {
  id: string;
  isEnabled: boolean;
  frequencyDays: number;
  lastRunAt: string | null;
}
