"use client";

import type { Wedding } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { locales } from "@/i18n/config";
import { TIMEZONES } from "@/lib/constants/timezones";
import { updateDefaultLanguage, updateGeneralSettings } from "../actions";

function formatDateForInput(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0] ?? "";
}

export function GeneralSection({ wedding }: { wedding: Wedding }) {
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

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español (Spanish)",
};

export function LanguageSection({ wedding }: { wedding: Wedding }) {
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
