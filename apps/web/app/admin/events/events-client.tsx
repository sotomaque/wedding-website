"use client";

import { Button } from "@workspace/ui/components/button";
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
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Calendar,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  display_order: number;
  created_at: string;
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
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
}

const defaultFormData: EventFormData = {
  name: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  locationName: "",
  locationAddress: "",
  latitude: "",
  longitude: "",
  isDefault: false,
};

export function EventsClient({ initialEvents }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
      eventDate: event.event_date || "",
      startTime: event.start_time?.slice(0, 5) || "",
      endTime: event.end_time?.slice(0, 5) || "",
      locationName: event.location_name || "",
      locationAddress: event.location_address || "",
      latitude: event.latitude?.toString() || "",
      longitude: event.longitude?.toString() || "",
      isDefault: event.is_default,
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
                  event_date: data.event.event_date.split("T")[0],
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
          event_date: data.event.event_date?.split("T")[0] ?? null,
          inviteCount: data.event.is_default
            ? (events[0]?.inviteCount ?? 0)
            : 0,
          confirmedCount: 0,
          declinedCount: 0,
          pendingCount: data.event.is_default
            ? (events[0]?.inviteCount ?? 0)
            : 0,
        };
        setEvents((prev) =>
          [...prev, newEvent].sort((a, b) => a.display_order - b.display_order),
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
    if (
      !confirm(
        `Are you sure you want to delete "${event.name}"? This will also remove all guest invitations for this event.`,
      )
    ) {
      return;
    }

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
                    {event.is_default && (
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
                    {event.event_date ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground italic">
                        <Calendar className="h-4 w-4" />
                        <span>Date TBD</span>
                      </div>
                    )}
                    {event.start_time ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground italic">
                        <Clock className="h-4 w-4" />
                        <span>Time TBD</span>
                      </div>
                    )}
                    {event.location_name ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location_name}</span>
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

                  {event.location_address && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {event.location_address}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!event.is_default && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/events/${event.id}/invites`}>
                        <Users className="h-4 w-4 mr-1" />
                        Manage Invites
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(event)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(event)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
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
                <Label htmlFor="eventDate">Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      eventDate: e.target.value,
                    }))
                  }
                />
              </div>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
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
                placeholder="The Immaculata Church"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationAddress">Address</Label>
              <Input
                id="locationAddress"
                value={formData.locationAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    locationAddress: e.target.value,
                  }))
                }
                placeholder="123 Main St, San Diego, CA"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      latitude: e.target.value,
                    }))
                  }
                  placeholder="32.7719"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      longitude: e.target.value,
                    }))
                  }
                  placeholder="-117.1902"
                />
              </div>
            </div>

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
