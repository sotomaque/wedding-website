"use client";

import type { Wedding } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationSettings } from "../actions";
import type { AdminSummaryConfig, ReminderSchedule } from "./types";

export function NotificationsSection({ wedding }: { wedding: Wedding }) {
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

export function AutomatedEmailsSection({
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
