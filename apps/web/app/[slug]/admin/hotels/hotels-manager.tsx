"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createHotel,
  deleteHotel,
  type Hotel,
  type HotelInput,
  type HotelType,
  reorderHotels,
  updateHotel,
} from "./actions";
import { HOTEL_TYPE_COLORS, HOTEL_TYPE_LABELS, HOTEL_TYPES } from "./constants";

const NO_TYPE = "none";

interface HotelForm {
  name: string;
  description: string;
  address: string;
  websiteUrl: string;
  phone: string;
  imageUrl: string;
  hotelType: HotelType | null;
  distanceToVenue: string;
  parkingInfo: string;
  amenities: string;
}

const emptyForm: HotelForm = {
  name: "",
  description: "",
  address: "",
  websiteUrl: "",
  phone: "",
  imageUrl: "",
  hotelType: null,
  distanceToVenue: "",
  parkingInfo: "",
  amenities: "",
};

function toInput(form: HotelForm): HotelInput {
  return { ...form };
}

export function HotelsManager({ initialHotels }: { initialHotels: Hotel[] }) {
  const [hotels, setHotels] = useState(initialHotels);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HotelForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(hotel: Hotel) {
    setEditId(hotel.id);
    setForm({
      name: hotel.name,
      description: hotel.description || "",
      address: hotel.address || "",
      websiteUrl: hotel.websiteUrl || "",
      phone: hotel.phone || "",
      imageUrl: hotel.imageUrl || "",
      hotelType: hotel.hotelType,
      distanceToVenue: hotel.distanceToVenue || "",
      parkingInfo: hotel.parkingInfo || "",
      amenities: hotel.amenities || "",
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        const result = await updateHotel(editId, toInput(form));
        if (result.success) {
          setHotels((prev) =>
            prev.map((h) => (h.id === editId ? { ...h, ...toInput(form) } : h)),
          );
          toast.success("Hotel updated");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to update");
        }
      } else {
        const result = await createHotel(toInput(form));
        if (result.success && result.hotel) {
          const newHotel = result.hotel;
          setHotels((prev) => [...prev, newHotel]);
          toast.success("Hotel added");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to create");
        }
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const hotel = hotels.find((h) => h.id === id);
    if (!hotel) return;
    if (!window.confirm(`Delete "${hotel.name}"? This cannot be undone.`))
      return;

    const result = await deleteHotel(id);
    if (result.success) {
      setHotels((prev) => prev.filter((h) => h.id !== id));
      toast.success("Hotel deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  function handleMove(index: number, direction: "up" | "down") {
    const next = [...hotels];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    const a = next[index];
    const b = next[swap];
    if (!a || !b) return;
    next[index] = b;
    next[swap] = a;
    const previous = hotels;
    setHotels(next);

    startTransition(async () => {
      const result = await reorderHotels(next.map((h) => h.id));
      if (!result.success) {
        setHotels(previous);
        toast.error("Failed to reorder");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Hotels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recommend places to stay. Hotels appear on your public hotels page.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Hotel
        </Button>
      </div>

      {hotels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No hotels yet</p>
          <p className="text-sm mt-1">
            Add your first recommendation to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel, index) => (
            <div
              key={hotel.id}
              className="relative border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium truncate">{hotel.name}</h3>
                {hotel.hotelType && (
                  <Badge
                    variant="secondary"
                    className={HOTEL_TYPE_COLORS[hotel.hotelType]}
                  >
                    {HOTEL_TYPE_LABELS[hotel.hotelType]}
                  </Badge>
                )}
              </div>

              {hotel.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {hotel.description}
                </p>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                {hotel.distanceToVenue && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {hotel.distanceToVenue}
                  </p>
                )}
                {hotel.phone && (
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {hotel.phone}
                  </p>
                )}
                {hotel.websiteUrl && (
                  <a
                    href={hotel.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Website
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0 || isPending}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === hotels.length - 1 || isPending}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(hotel)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(hotel.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Hotel" : "Add Hotel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hotel-name">Name *</Label>
              <Input
                id="hotel-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. The Grand Hotel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-description">Description</Label>
              <Textarea
                id="hotel-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="A brief description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hotel-type">Tier</Label>
                <Select
                  value={form.hotelType ?? NO_TYPE}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      hotelType: v === NO_TYPE ? null : (v as HotelType),
                    })
                  }
                >
                  <SelectTrigger id="hotel-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TYPE}>Unspecified</SelectItem>
                    {HOTEL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-distance">Distance to venue</Label>
                <Input
                  id="hotel-distance"
                  value={form.distanceToVenue}
                  onChange={(e) =>
                    setForm({ ...form, distanceToVenue: e.target.value })
                  }
                  placeholder="e.g. 5 min drive"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-address">Address</Label>
              <Input
                id="hotel-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Main St, City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hotel-website">Website URL</Label>
                <Input
                  id="hotel-website"
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm({ ...form, websiteUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-phone">Phone</Label>
                <Input
                  id="hotel-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-image">Image URL</Label>
              <Input
                id="hotel-image"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-parking">Parking info</Label>
              <Input
                id="hotel-parking"
                value={form.parkingInfo}
                onChange={(e) =>
                  setForm({ ...form, parkingInfo: e.target.value })
                }
                placeholder="e.g. Free self-parking"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-amenities">Amenities</Label>
              <Textarea
                id="hotel-amenities"
                value={form.amenities}
                onChange={(e) =>
                  setForm({ ...form, amenities: e.target.value })
                }
                placeholder="Pool, gym, free breakfast..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
