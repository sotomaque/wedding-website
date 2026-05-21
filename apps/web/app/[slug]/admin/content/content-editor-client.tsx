"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
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

  // AI Story Writer state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [bulletPoints, setBulletPoints] = useState("");
  const [tone, setTone] = useState<
    "romantic" | "humorous" | "formal" | "casual"
  >("romantic");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!bulletPoints.trim()) {
      toast.error("Please add some notes about your story");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/ai/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletPoints, tone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate story");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setBodyHtml(accumulated);
      }

      setAiDialogOpen(false);
      setBulletPoints("");
      toast.success("Story generated! Review and edit as needed.");
    } catch (error) {
      console.error("Error generating story:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate story",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [bulletPoints, tone]);

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
        <div className="flex items-center justify-between">
          <Label htmlFor="story-title">Title</Label>
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI Write
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>AI Story Writer</DialogTitle>
                <DialogDescription>
                  Share some notes about your relationship and we will craft a
                  beautiful story for your wedding website.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-bullet-points">
                    Tell us about how you met, key moments, etc.
                  </Label>
                  <Textarea
                    id="ai-bullet-points"
                    value={bulletPoints}
                    onChange={(e) => setBulletPoints(e.target.value)}
                    placeholder="We met at a coffee shop in 2019... Our first date was... He proposed at..."
                    className="min-h-37.5"
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-tone">Tone</Label>
                  <Select
                    value={tone}
                    onValueChange={(v) =>
                      setTone(
                        v as "romantic" | "humorous" | "formal" | "casual",
                      )
                    }
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="ai-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="romantic">Romantic</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !bulletPoints.trim()}
                >
                  {isGenerating ? (
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
        </div>
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

interface AdditionalInfoItem {
  clientId: string;
  title: string;
  description: string;
}

function DetailsEditor({ initial }: { initial?: DetailsContent }) {
  const [isPending, startTransition] = useTransition();
  const slug = useWeddingSlug();
  const [title, setTitle] = useState(initial?.title ?? "");

  // Use stable clientIds (not array indices, and not the item's own title)
  // for React keys so editing a title doesn't remount the input and lose
  // focus on every keystroke.
  const nextClientId = useRef(0);
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfoItem[]>(
    () =>
      (initial?.additionalInfo ?? []).map((item) => ({
        clientId: `seed-${nextClientId.current++}`,
        title: item.title,
        description: item.description,
      })),
  );

  function addInfo() {
    setAdditionalInfo((prev) => [
      ...prev,
      {
        clientId: `new-${nextClientId.current++}`,
        title: "",
        description: "",
      },
    ]);
  }

  function removeInfo(clientId: string) {
    setAdditionalInfo((prev) =>
      prev.filter((item) => item.clientId !== clientId),
    );
  }

  function updateInfo(
    clientId: string,
    field: "title" | "description",
    value: string,
  ) {
    setAdditionalInfo((prev) =>
      prev.map((item) =>
        item.clientId === clientId ? { ...item, [field]: value } : item,
      ),
    );
  }

  function handleSave() {
    startTransition(async () => {
      // Ceremony and reception venue/address/time are sourced from the
      // events table — admins edit them on the Events page, not here, so
      // we don't write those fields from the details editor anymore. Any
      // existing values stay in the DB row untouched (we only overwrite
      // title and additionalInfo); the public page prefers events anyway.
      const data: Record<string, unknown> = { title };
      const filtered = additionalInfo.filter(
        (item) => item.title.trim() !== "",
      );
      if (filtered.length > 0) {
        data.additionalInfo = filtered.map(({ title, description }) => ({
          title,
          description,
        }));
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

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Ceremony and reception venue, address, and time come from your{" "}
        <Link
          href={`/${slug}/admin/events`}
          className="font-medium text-foreground underline"
        >
          Events page
        </Link>
        . Edit them there to update what guests see in this section.
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Additional Info</Label>
          <Button type="button" variant="outline" size="sm" onClick={addInfo}>
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {additionalInfo.map((item) => (
            <div
              key={item.clientId}
              className="flex gap-2 items-start border border-border rounded-lg p-3"
            >
              <div className="flex-1 space-y-2">
                <Input
                  value={item.title}
                  onChange={(e) =>
                    updateInfo(item.clientId, "title", e.target.value)
                  }
                  placeholder="Title"
                />
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateInfo(item.clientId, "description", e.target.value)
                  }
                  placeholder="Description"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInfo(item.clientId)}
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
