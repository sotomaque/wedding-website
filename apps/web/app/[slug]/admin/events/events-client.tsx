"use client";

import { Button } from "@workspace/ui/components/button";
import { Calendar as CalendarPicker } from "@workspace/ui/components/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import {
  BarChart3,
  Calendar,
  CalendarIcon,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import { formatEventDateRange } from "@/lib/utils/event-format";
import { ShareEventDialog } from "./share-event-dialog";

interface Event {
  id: string;
  name: string;
  description: string | null;
  eventDate: string | null;
  endDate?: string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  capacity: number | null;
  publicRsvpToken: string | null;
  publicRsvpEnabled: boolean;
  displayOrder: number;
  createdAt: string;
  inviteCount: number;
  confirmedCount: number;
  declinedCount: number;
  pendingCount: number;
}

interface EventsClientProps {
  initialEvents: Event[];
}

interface EventFormData {
  name: string;
  description: string;
  eventDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
  capacity: string;
}

const defaultFormData: EventFormData = {
  name: "",
  description: "",
  eventDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  locationName: "",
  locationAddress: "",
  latitude: "",
  longitude: "",
  isDefault: false,
  capacity: "",
};

// Hoisted helpers — avoid recreating on every render
function formatTime(time: string) {
  const timeStr = time.includes("T")
    ? new Date(time).toISOString().slice(11, 16)
    : time;
  const [hours, minutes] = timeStr.split(":");
  const hour = Number.parseInt(hours || "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function EventsClient({ initialEvents }: EventsClientProps) {
  const slug = useWeddingSlug();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || "",
      eventDate:
        event.eventDate &&
        !Number.isNaN(new Date(`${event.eventDate}T00:00:00`).getTime())
          ? String(event.eventDate)
          : "",
      endDate: event.endDate || "",
      startTime: event.startTime
        ? new Date(event.startTime).toISOString().slice(11, 16)
        : "",
      endTime: event.endTime
        ? new Date(event.endTime).toISOString().slice(11, 16)
        : "",
      locationName: event.locationName || "",
      locationAddress: event.locationAddress || "",
      latitude: event.latitude?.toString() || "",
      longitude: event.longitude?.toString() || "",
      isDefault: event.isDefault,
      capacity: event.capacity != null ? String(event.capacity) : "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        eventDate: formData.eventDate,
        endDate: formData.endDate || null,
        startTime: formData.startTime,
        endTime: formData.endTime || null,
        locationName: formData.locationName,
        locationAddress: formData.locationAddress || null,
        latitude: formData.latitude
          ? Number.parseFloat(formData.latitude)
          : null,
        longitude: formData.longitude
          ? Number.parseFloat(formData.longitude)
          : null,
        isDefault: formData.isDefault,
        capacity: formData.capacity
          ? Number.parseInt(formData.capacity, 10)
          : null,
      };

      if (editingEvent) {
        const response = await fetch(`/api/admin/events/${editingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update event");

        const data = await response.json();
        setEvents((prev) =>
          prev.map((e) =>
            e.id === editingEvent.id
              ? {
                  ...data.event,
                  eventDate: data.event.eventDate.split("T")[0],
                  inviteCount: e.inviteCount,
                  confirmedCount: e.confirmedCount,
                  declinedCount: e.declinedCount,
                  pendingCount: e.pendingCount,
                }
              : e,
          ),
        );
        toast.success("Event updated successfully");
      } else {
        const response = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create event");

        const data = await response.json();
        const newEvent: Event = {
          ...data.event,
          eventDate: data.event.eventDate?.split("T")[0] ?? null,
          inviteCount: data.event.isDefault ? (events[0]?.inviteCount ?? 0) : 0,
          confirmedCount: 0,
          declinedCount: 0,
          pendingCount: data.event.isDefault
            ? (events[0]?.inviteCount ?? 0)
            : 0,
        };
        setEvents((prev) =>
          [...prev, newEvent].sort((a, b) => a.displayOrder - b.displayOrder),
        );
        toast.success("Event created successfully");
      }

      setIsDialogOpen(false);
      setEditingEvent(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (event: Event) => {
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event");

      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage wedding events and guest invitations
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No events created yet.</p>
          <p className="text-sm mt-2">
            Click "Add Event" to create your first event.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-6 bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-semibold">{event.name}</h2>
                    {event.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        All Guests Invited
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-muted-foreground mb-4">
                      {event.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {event.eventDate ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {event.endDate && event.endDate > event.eventDate
                            ? formatEventDateRange(
                                event.eventDate,
                                event.endDate,
                              )
                            : formatDate(event.eventDate)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground italic">
                        <Calendar className="h-4 w-4" />
                        <span>Date TBD</span>
                      </div>
                    )}
                    {event.startTime ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(event.startTime)}
                          {event.endTime && ` - ${formatTime(event.endTime)}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground italic">
                        <Clock className="h-4 w-4" />
                        <span>Time TBD</span>
                      </div>
                    )}
                    {event.locationName ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.locationName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground italic">
                        <MapPin className="h-4 w-4" />
                        <span>Location TBD</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {event.confirmedCount} confirmed / {event.inviteCount}{" "}
                        invited
                      </span>
                    </div>
                  </div>

                  {event.locationAddress && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {event.locationAddress}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/${slug}/admin/events/${event.id}`}>
                      <BarChart3 className="h-4 w-4 mr-1" />
                      RSVPs
                    </a>
                  </Button>
                  {!event.isDefault && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/${slug}/admin/events/${event.id}/invites`}>
                        <Users className="h-4 w-4 mr-1" />
                        Manage Invites
                      </a>
                    </Button>
                  )}
                  <ShareEventDialog
                    eventId={event.id}
                    eventName={event.name}
                    initialEnabled={event.publicRsvpEnabled}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(event)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    }
                    title="Delete Event"
                    description={`Are you sure you want to delete "${event.name}"? This will also remove all guest invitations for this event.`}
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={() => handleDelete(event)}
                  />
                </div>
              </div>

              {/* RSVP Stats */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Confirmed: {event.confirmedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Declined: {event.declinedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending: {event.pendingCount}</span>
                  </div>
                  {event.capacity != null && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span
                        className={
                          event.confirmedCount >= event.capacity
                            ? "text-amber-600 font-medium"
                            : ""
                        }
                      >
                        Capacity: {event.confirmedCount}/{event.capacity}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Create Event"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Update the event details below."
                : "Fill in the details to create a new event."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Wedding Ceremony"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="A brief description of the event..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.eventDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.eventDate &&
                      !Number.isNaN(
                        new Date(`${formData.eventDate}T00:00:00`).getTime(),
                      )
                        ? format(
                            new Date(`${formData.eventDate}T00:00:00`),
                            "MMM d, yyyy",
                          )
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={
                        formData.eventDate &&
                        !Number.isNaN(
                          new Date(`${formData.eventDate}T00:00:00`).getTime(),
                        )
                          ? new Date(`${formData.eventDate}T00:00:00`)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const dd = String(date.getDate()).padStart(2, "0");
                          setFormData((prev) => ({
                            ...prev,
                            eventDate: `${yyyy}-${mm}-${dd}`,
                          }));
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate &&
                      !Number.isNaN(
                        new Date(`${formData.endDate}T00:00:00`).getTime(),
                      )
                        ? format(
                            new Date(`${formData.endDate}T00:00:00`),
                            "MMM d, yyyy",
                          )
                        : "Single day"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={
                        formData.endDate
                          ? new Date(`${formData.endDate}T00:00:00`)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const dd = String(date.getDate()).padStart(2, "0");
                          setFormData((prev) => ({
                            ...prev,
                            endDate: `${yyyy}-${mm}-${dd}`,
                          }));
                        }
                      }}
                    />
                    {formData.endDate && (
                      <div className="border-t border-border p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, endDate: "" }))
                          }
                        >
                          Clear (single day)
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Leave blank for a single-day event.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name</Label>
              <Input
                id="locationName"
                value={formData.locationName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    locationName: e.target.value,
                  }))
                }
                placeholder="St. Therese Church"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationAddress">Address</Label>
              <AddressAutocomplete
                id="locationAddress"
                value={formData.locationAddress}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    locationAddress: val,
                  }))
                }
                onSelect={(result) =>
                  setFormData((prev) => ({
                    ...prev,
                    locationAddress: result.formattedAddress,
                    latitude: result.latitude.toString(),
                    longitude: result.longitude.toString(),
                  }))
                }
                placeholder="123 Main St, San Diego, CA"
              />
            </div>

            {formData.latitude && formData.longitude && (
              <p className="text-xs text-muted-foreground">
                Coordinates: {formData.latitude}, {formData.longitude}{" "}
                (auto-filled from address)
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault">Invite All Guests</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically invite all guests to this event
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isDefault: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, capacity: e.target.value }))
                }
                placeholder="No limit"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Once this many guests have confirmed, the public RSVP
                link stops accepting new attendees.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingEvent
                    ? "Update Event"
                    : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
