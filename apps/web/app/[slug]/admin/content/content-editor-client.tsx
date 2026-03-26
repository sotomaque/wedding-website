"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type {
  DetailsContent,
  HeroContent,
  RsvpContent,
  ScheduleContent,
  StoryContent,
} from "@/lib/validations/wedding-content";
import { updateWeddingContent } from "./actions";

type Tab = "hero" | "story" | "details" | "schedule" | "rsvp";

const TABS: { key: Tab; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "story", label: "Story" },
  { key: "details", label: "Details" },
  { key: "schedule", label: "Schedule" },
  { key: "rsvp", label: "RSVP" },
];

interface ContentEditorClientProps {
  content: Record<string, unknown>;
}

export function ContentEditorClient({ content }: ContentEditorClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("hero");

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-6">Content Editor</h1>

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

      {activeTab === "hero" && (
        <HeroEditor initial={content.hero as HeroContent | undefined} />
      )}
      {activeTab === "story" && (
        <StoryEditor initial={content.story as StoryContent | undefined} />
      )}
      {activeTab === "details" && (
        <DetailsEditor
          initial={content.details as DetailsContent | undefined}
        />
      )}
      {activeTab === "schedule" && (
        <ScheduleEditor
          initial={content.schedule as ScheduleContent | undefined}
        />
      )}
      {activeTab === "rsvp" && (
        <RsvpEditor initial={content.rsvp as RsvpContent | undefined} />
      )}
    </div>
  );
}

function HeroEditor({ initial }: { initial?: HeroContent }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");

  function handleSave() {
    startTransition(async () => {
      const result = await updateWeddingContent("hero", { title });
      if (result.success) {
        toast.success("Hero content saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="hero-title">Title</Label>
        <Input
          id="hero-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="We're Getting Married!"
          className="mt-1"
        />
      </div>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Hero"}
      </Button>
    </div>
  );
}

function StoryEditor({ initial }: { initial?: StoryContent }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");

  // Convert legacy paragraphs to HTML if no bodyHtml exists
  const initialHtml =
    initial?.bodyHtml ??
    (initial?.paragraphs ?? []).map((p) => `<p>${p}</p>`).join("");
  const [bodyHtml, setBodyHtml] = useState(initialHtml);

  function handleSave() {
    // Extract plain text paragraphs from HTML for backward compat
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = bodyHtml;
    const paragraphs = Array.from(tempDiv.querySelectorAll("p"))
      .map((p) => p.textContent?.trim() ?? "")
      .filter((p) => p.length > 0);

    startTransition(async () => {
      const result = await updateWeddingContent("story", {
        title,
        bodyHtml,
        paragraphs,
      });
      if (result.success) {
        toast.success("Story content saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Label htmlFor="story-title">Title</Label>
        <Input
          id="story-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Our Story"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Story</Label>
        <div className="mt-1">
          <RichTextEditor
            content={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Tell your love story..."
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Use the toolbar to format text with headings, bold, italic, lists, and
          more.
        </p>
      </div>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Story"}
      </Button>
    </div>
  );
}

function DetailsEditor({ initial }: { initial?: DetailsContent }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [ceremony, setCeremony] = useState({
    venue: initial?.ceremony?.venue ?? "",
    address: initial?.ceremony?.address ?? "",
    time: initial?.ceremony?.time ?? "",
    location: initial?.ceremony?.location ?? "",
  });
  const [reception, setReception] = useState({
    venue: initial?.reception?.venue ?? "",
    address: initial?.reception?.address ?? "",
    time: initial?.reception?.time ?? "",
    description: initial?.reception?.description ?? "",
  });
  const [additionalInfo, setAdditionalInfo] = useState<
    { title: string; description: string }[]
  >(initial?.additionalInfo ?? []);

  function addInfo() {
    setAdditionalInfo((prev) => [...prev, { title: "", description: "" }]);
  }

  function removeInfo(index: number) {
    setAdditionalInfo((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInfo(
    index: number,
    field: "title" | "description",
    value: string,
  ) {
    setAdditionalInfo((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const data: Record<string, unknown> = { title };
      if (ceremony.venue) {
        data.ceremony = {
          title: "Ceremony",
          venue: ceremony.venue,
          address: ceremony.address || undefined,
          time: ceremony.time || undefined,
          location: ceremony.location || undefined,
        };
      }
      if (reception.venue) {
        data.reception = {
          title: "Reception",
          venue: reception.venue,
          address: reception.address || undefined,
          time: reception.time || undefined,
          description: reception.description || undefined,
        };
      }
      if (additionalInfo.length > 0) {
        data.additionalInfo = additionalInfo.filter(
          (item) => item.title.trim() !== "",
        );
      }

      const result = await updateWeddingContent("details", data);
      if (result.success) {
        toast.success("Details content saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Label htmlFor="details-title">Section Title</Label>
        <Input
          id="details-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wedding Details"
          className="mt-1"
        />
      </div>

      <fieldset className="border border-border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-medium px-2">Ceremony</legend>
        <div>
          <Label htmlFor="ceremony-venue">Venue</Label>
          <Input
            id="ceremony-venue"
            value={ceremony.venue}
            onChange={(e) =>
              setCeremony((prev) => ({ ...prev, venue: e.target.value }))
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ceremony-address">Address</Label>
          <AddressAutocomplete
            id="ceremony-address"
            value={ceremony.address}
            onChange={(val) =>
              setCeremony((prev) => ({ ...prev, address: val }))
            }
            className="mt-1"
            placeholder="Start typing an address..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ceremony-time">Time</Label>
            <Input
              id="ceremony-time"
              value={ceremony.time}
              onChange={(e) =>
                setCeremony((prev) => ({ ...prev, time: e.target.value }))
              }
              placeholder="3:00 PM"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ceremony-location">Location</Label>
            <Input
              id="ceremony-location"
              value={ceremony.location}
              onChange={(e) =>
                setCeremony((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              placeholder="Garden"
              className="mt-1"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-medium px-2">Reception</legend>
        <div>
          <Label htmlFor="reception-venue">Venue</Label>
          <Input
            id="reception-venue"
            value={reception.venue}
            onChange={(e) =>
              setReception((prev) => ({ ...prev, venue: e.target.value }))
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="reception-address">Address</Label>
          <AddressAutocomplete
            id="reception-address"
            value={reception.address}
            onChange={(val) =>
              setReception((prev) => ({ ...prev, address: val }))
            }
            className="mt-1"
            placeholder="Start typing an address..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reception-time">Time</Label>
            <Input
              id="reception-time"
              value={reception.time}
              onChange={(e) =>
                setReception((prev) => ({ ...prev, time: e.target.value }))
              }
              placeholder="5:00 PM"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="reception-description">Description</Label>
            <Input
              id="reception-description"
              value={reception.description}
              onChange={(e) =>
                setReception((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Dinner & Dancing"
              className="mt-1"
            />
          </div>
        </div>
      </fieldset>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Additional Info</Label>
          <Button type="button" variant="outline" size="sm" onClick={addInfo}>
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {additionalInfo.map((item, i) => (
            <div
              key={`info-${i}-${item.title.slice(0, 10)}`}
              className="flex gap-2 items-start border border-border rounded-lg p-3"
            >
              <div className="flex-1 space-y-2">
                <Input
                  value={item.title}
                  onChange={(e) => updateInfo(i, "title", e.target.value)}
                  placeholder="Title"
                />
                <Input
                  value={item.description}
                  onChange={(e) => updateInfo(i, "description", e.target.value)}
                  placeholder="Description"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInfo(i)}
                className="shrink-0 text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Details"}
      </Button>
    </div>
  );
}

function ScheduleEditor({ initial }: { initial?: ScheduleContent }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [events, setEvents] = useState<
    { id: string; time: string; event: string; description: string }[]
  >(
    initial?.events?.map((e) => ({
      id: e.id,
      time: e.time,
      event: e.event,
      description: e.description ?? "",
    })) ?? [],
  );

  function addEvent() {
    setEvents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        time: "",
        event: "",
        description: "",
      },
    ]);
  }

  function removeEvent(index: number) {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEvent(
    index: number,
    field: "time" | "event" | "description",
    value: string,
  ) {
    setEvents((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateWeddingContent("schedule", {
        title,
        events: events
          .filter((e) => e.event.trim() !== "")
          .map((e) => ({
            id: e.id,
            time: e.time,
            event: e.event,
            description: e.description || undefined,
          })),
      });
      if (result.success) {
        toast.success("Schedule content saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="schedule-title">Section Title</Label>
        <Input
          id="schedule-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Schedule of Events"
          className="mt-1"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Events</Label>
          <Button type="button" variant="outline" size="sm" onClick={addEvent}>
            <Plus className="h-3 w-3 mr-1" />
            Add Event
          </Button>
        </div>
        <div className="space-y-3">
          {events.map((item, i) => (
            <div
              key={item.id}
              className="flex gap-2 items-start border border-border rounded-lg p-3"
            >
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.time}
                    onChange={(e) => updateEvent(i, "time", e.target.value)}
                    placeholder="3:00 PM"
                  />
                  <Input
                    value={item.event}
                    onChange={(e) => updateEvent(i, "event", e.target.value)}
                    placeholder="Event name"
                  />
                </div>
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateEvent(i, "description", e.target.value)
                  }
                  placeholder="Description (optional)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEvent(i)}
                className="shrink-0 text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No events yet. Click &quot;Add Event&quot; to get started.
            </p>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Schedule"}
      </Button>
    </div>
  );
}

function RsvpEditor({ initial }: { initial?: RsvpContent }) {
  const [isPending, startTransition] = useTransition();
  const slug = useWeddingSlug();
  const [title, setTitle] = useState(initial?.title ?? "");

  function handleSave() {
    startTransition(async () => {
      const result = await updateWeddingContent("rsvp", {
        title,
      });
      if (result.success) {
        toast.success("RSVP content saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="rsvp-title">Title</Label>
        <Input
          id="rsvp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="RSVP"
          className="mt-1"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        The RSVP deadline is managed in{" "}
        <a href={`/${slug}/admin/settings`} className="underline">
          Settings
        </a>
        .
      </p>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save RSVP"}
      </Button>
    </div>
  );
}
