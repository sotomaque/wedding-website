"use client";

import type { HotelType } from "@prisma/client";
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
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing-components";
import { createHotel, deleteHotel, type Hotel, updateHotel } from "./actions";

interface HotelForm {
  name: string;
  description: string;
  address: string;
  websiteUrl: string;
  phone: string;
  imageUrl: string;
  distanceToVenue: string;
  hotelType: HotelType | "";
}

const emptyForm: HotelForm = {
  name: "",
  description: "",
  address: "",
  websiteUrl: "",
  phone: "",
  imageUrl: "",
  distanceToVenue: "",
  hotelType: "",
};

export function HotelsManager({ initialItems }: { initialItems: Hotel[] }) {
  const [items, setItems] = useState(initialItems);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HotelForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(item: Hotel) {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      address: item.address ?? "",
      websiteUrl: item.websiteUrl ?? "",
      phone: item.phone ?? "",
      imageUrl: item.imageUrl ?? "",
      distanceToVenue: item.distanceToVenue ?? "",
      hotelType: item.hotelType ?? "",
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
        const result = await updateHotel(editId, form);
        if (result.success) {
          setItems((prev) =>
            prev.map((h) =>
              h.id === editId
                ? {
                    ...h,
                    name: form.name,
                    description: form.description || null,
                    address: form.address || null,
                    websiteUrl: form.websiteUrl || null,
                    phone: form.phone || null,
                    imageUrl: form.imageUrl || null,
                    distanceToVenue: form.distanceToVenue || null,
                    hotelType: form.hotelType || null,
                  }
                : h,
            ),
          );
          toast.success("Hotel updated");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to update");
        }
      } else {
        const result = await createHotel(form);
        if (result.success && result.item) {
          setItems((prev) => [...prev, result.item as Hotel]);
          toast.success("Hotel added");
          setShowDialog(false);
        } else {
          toast.error(result.error ?? "Failed to create");
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: Hotel) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`))
      return;
    const result = await deleteHotel(item.id);
    if (result.success) {
      setItems((prev) => prev.filter((h) => h.id !== item.id));
      toast.success("Hotel deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Hotels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage hotel recommendations shown on your wedding site for guest
            travel.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Hotel
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No hotels yet</p>
          <p className="text-sm mt-1">
            Add your first hotel recommendation to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-lg overflow-hidden bg-card flex flex-col"
            >
              {item.imageUrl && (
                // biome-ignore lint/performance/noImgElement: dynamic CDN URL
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <h3 className="font-medium">{item.name}</h3>
                {item.distanceToVenue && (
                  <p className="text-xs text-muted-foreground">
                    {item.distanceToVenue}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                    className="gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Hotel" : "Add Hotel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="hotel-name">Name *</Label>
              <Input
                id="hotel-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="The Fairmont Olympic"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hotel-description">Description</Label>
              <Textarea
                id="hotel-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Walking distance to the venue. Group block available with the code BRIDE2026."
                className="mt-1 min-h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hotel-distance">Distance to venue</Label>
                <Input
                  id="hotel-distance"
                  value={form.distanceToVenue}
                  onChange={(e) =>
                    setForm({ ...form, distanceToVenue: e.target.value })
                  }
                  placeholder="0.5 mi"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hotel-type">Tier</Label>
                <Select
                  value={form.hotelType || "_none"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      hotelType: v === "_none" ? "" : (v as HotelType),
                    })
                  }
                >
                  <SelectTrigger id="hotel-type" className="mt-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No tier</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="hotel-address">Address</Label>
              <Input
                id="hotel-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="411 University St, Seattle, WA"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hotel-website">Website</Label>
                <Input
                  id="hotel-website"
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm({ ...form, websiteUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hotel-phone">Phone</Label>
                <Input
                  id="hotel-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(206) 555-0123"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Image</Label>
              <div className="mt-1 flex items-start gap-3">
                {form.imageUrl && (
                  // biome-ignore lint/performance/noImgElement: dynamic CDN URL
                  <img
                    src={form.imageUrl}
                    alt="Hotel"
                    className="w-24 h-24 rounded-md object-cover border border-border"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <UploadButton
                    endpoint="photoUploader"
                    onClientUploadComplete={(res) => {
                      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
                      if (url) {
                        setForm((f) => ({ ...f, imageUrl: url }));
                        toast.success("Image uploaded");
                      }
                    }}
                    onUploadError={(err: Error) => {
                      toast.error(`Upload failed: ${err.message}`);
                    }}
                    appearance={{
                      button:
                        "ut-ready:bg-muted ut-ready:text-foreground ut-uploading:bg-muted text-xs h-8 px-3 rounded-md border border-border",
                      allowedContent: "hidden",
                    }}
                    content={{
                      button: (
                        <span className="flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          {form.imageUrl ? "Replace" : "Upload"}
                        </span>
                      ),
                    }}
                  />
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="text-xs text-muted-foreground hover:text-destructive text-left"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
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
              {isSaving ? "Saving..." : editId ? "Save changes" : "Add hotel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
