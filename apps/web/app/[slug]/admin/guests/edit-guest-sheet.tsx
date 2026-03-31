"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Guest } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import {
  type EditGuestFormData,
  editGuestSchema,
} from "@/lib/validations/guest";
import type { EventOption, PartyOption } from "./actions";

// PostgreSQL date columns are returned as Date objects by the pg driver.
// Convert to the "YYYY-MM-DD" string that <input type="date"> requires.
function toDateInput(val: unknown): string {
  if (!val) return "";
  try {
    return new Date(val as string | Date).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

interface EditGuestSheetProps {
  guest: Guest;
  plusOne: Guest | null;
  parties: PartyOption[];
  events: EventOption[];
  guestEventIds: string[];
}

export function EditGuestSheet({
  guest,
  plusOne,
  parties,
  events,
  guestEventIds,
}: EditGuestSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBListEmailDialog, setShowBListEmailDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingActivities, setIsSendingActivities] = useState(false);
  const [isSettingRsvp, setIsSettingRsvp] = useState(false);
  const [localRsvpStatus, setLocalRsvpStatus] = useState(guest.rsvpStatus);
  const [selectedEventIds, setSelectedEventIds] =
    useState<string[]>(guestEventIds);
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();

  // Memoize initial values from DB to compare against current form values
  const initialValues = useMemo(
    (): EditGuestFormData => ({
      firstName: guest.firstName,
      lastName: guest.lastName || "",
      email: guest.email || "",
      side: (guest.side || "bride") as "bride" | "groom" | "both",
      list: guest.list as "a" | "b" | "c",
      plusOneAllowed: guest.plusOneAllowed || false,
      plusOneFirstName: plusOne?.firstName || "",
      plusOneLastName: plusOne?.lastName || "",
      mailingAddress: guest.mailingAddress || "",
      physicalInviteSent: guest.physicalInviteSent || false,
      phoneNumber: guest.phoneNumber || "",
      whatsapp: guest.whatsapp || "",
      preferredContactMethod: (guest.preferredContactMethod || "") as
        | "email"
        | "text"
        | "whatsapp"
        | "phone_call"
        | "",
      family: guest.family || false,
      under21: guest.under21 || false,
      threeAndUnder: guest.threeAndUnder || false,
      notes: guest.notes || "",
      gender: (guest.gender || "") as "male" | "female" | "",
      bridalPartyRole: (guest.bridalPartyRole || "") as
        | "groomsman"
        | "best_man"
        | "bridesmaid"
        | "maid_of_honor"
        | "",
      preferredLanguage: (guest.preferredLanguage || "") as "en" | "es" | "",
      partyId: guest.partyId || "",
      arrivalDate: toDateInput(guest.arrivalDate),
      arrivalTransport: guest.arrivalTransport || "",
      departureDate: toDateInput(guest.departureDate),
      departureTransport: guest.departureTransport || "",
      accommodationNotes: guest.accommodationNotes || "",
    }),
    [guest, plusOne],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditGuestFormData>({
    resolver: zodResolver(editGuestSchema),
    defaultValues: initialValues,
  });

  const plusOneAllowed = watch("plusOneAllowed");
  const physicalInviteSent = watch("physicalInviteSent");
  const family = watch("family");
  const under21 = watch("under21");
  const threeAndUnder = watch("threeAndUnder");

  // Watch all form values to detect changes
  const formValues = watch();

  // Check if form has changed from initial DB values
  const hasFormChanged = useMemo(() => {
    const fieldsToCompare: (keyof EditGuestFormData)[] = [
      "firstName",
      "lastName",
      "email",
      "side",
      "list",
      "plusOneAllowed",
      "plusOneFirstName",
      "plusOneLastName",
      "mailingAddress",
      "physicalInviteSent",
      "phoneNumber",
      "whatsapp",
      "preferredContactMethod",
      "preferredLanguage",
      "family",
      "under21",
      "threeAndUnder",
      "notes",
      "gender",
      "bridalPartyRole",
      "partyId",
      "arrivalDate",
      "arrivalTransport",
      "departureDate",
      "departureTransport",
      "accommodationNotes",
    ];

    const formFieldChanged = fieldsToCompare.some((field) => {
      const initial = initialValues[field] ?? "";
      const current = formValues[field] ?? "";
      return initial !== current;
    });

    // Also check if event invitations changed
    const eventsChanged =
      selectedEventIds.length !== guestEventIds.length ||
      selectedEventIds.some((id) => !guestEventIds.includes(id));

    return formFieldChanged || eventsChanged;
  }, [formValues, initialValues, selectedEventIds, guestEventIds]);

  function closeSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.push(`/${slug}/admin/guests?${params.toString()}`, {
      scroll: false,
    });
  }

  async function handleSetRsvp(status: "yes" | "no" | "pending") {
    setIsSettingRsvp(true);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}/set-rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpStatus: status }),
      });

      if (response.ok) {
        setLocalRsvpStatus(status);
        const label =
          status === "yes"
            ? "Attending"
            : status === "no"
              ? "Declined"
              : "Pending";
        toast.success("RSVP updated!", {
          description: `${guest.firstName} marked as ${label}`,
        });
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update RSVP");
      }
    } catch {
      toast.error("Failed to update RSVP");
    } finally {
      setIsSettingRsvp(false);
    }
  }

  async function onSubmit(data: EditGuestFormData) {
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, eventIds: selectedEventIds }),
      });

      if (response.ok) {
        toast.success("Guest updated!", {
          description:
            `${data.firstName} ${data.lastName || ""} has been updated`.trim(),
        });
        closeSheet();
        router.refresh();
      } else {
        toast.error("Failed to update guest");
      }
    } catch (error) {
      console.error("Error updating guest:", error);
      toast.error("Failed to update guest");
    }
  }

  // Get current email and list from form to check if send button should be enabled
  const currentEmail = watch("email");
  const currentList = watch("list");
  const hasValidEmail = currentEmail?.includes("@");
  const isBListOrLower = currentList === "b" || currentList === "c";

  function handleEmailButtonClick() {
    if (!hasValidEmail) return;

    // Show confirmation dialog for B-list or C-list guests
    if (isBListOrLower) {
      setShowBListEmailDialog(true);
    } else {
      handleResendEmail();
    }
  }

  async function handleResendEmail() {
    if (!hasValidEmail) return;

    setShowBListEmailDialog(false);
    setIsResending(true);
    try {
      const response = await fetch("/api/admin/guests/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, email: currentEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email sent!", {
          description: `Invitation email sent to ${data.email || currentEmail}`,
        });
        router.refresh();
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setIsResending(false);
    }
  }

  async function handleSendActivitiesEmail() {
    if (!hasValidEmail) return;

    setIsSendingActivities(true);
    try {
      const response = await fetch("/api/admin/guests/send-activities-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, email: currentEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Activities email sent!", {
          description: `Activities invitation sent to ${data.email || currentEmail}`,
        });
        router.refresh();
      } else {
        toast.error(data.error || "Failed to send activities email");
      }
    } catch (error) {
      console.error("Error sending activities email:", error);
      toast.error("Failed to send activities email");
    } finally {
      setIsSendingActivities(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/guests?id=${guest.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Guest deleted", {
          description:
            `${guest.firstName} ${guest.lastName || ""} has been removed`.trim(),
        });
        setShowDeleteDialog(false);
        closeSheet();
        router.refresh();
      } else {
        toast.error("Failed to delete guest");
      }
    } catch (error) {
      console.error("Error deleting guest:", error);
      toast.error("Failed to delete guest");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Sheet open onOpenChange={closeSheet}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col h-full">
        <SheetHeader className="shrink-0">
          <SheetTitle className="text-2xl font-serif">Edit Guest</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-sm text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Side</Label>
                <Select
                  value={watch("side")}
                  onValueChange={(value: "bride" | "groom" | "both") =>
                    setValue("side", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bride">Bride</SelectItem>
                    <SelectItem value="groom">Groom</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>List</Label>
                <Select
                  value={watch("list")}
                  onValueChange={(value: "a" | "b" | "c") =>
                    setValue("list", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">A List</SelectItem>
                    <SelectItem value="b">B List</SelectItem>
                    <SelectItem value="c">C List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Party Assignment */}
            <div className="space-y-2">
              <Label>Party</Label>
              <Select
                value={watch("partyId") || "none"}
                onValueChange={(value) =>
                  setValue("partyId", value === "none" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No party assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No party assigned</SelectItem>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.inviteCode} -{" "}
                      {party.name || party.guestNames || "Empty party"} (
                      {party.guestCount} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Move this guest to a different party
              </p>
            </div>

            {/* Plus One Section - Only show for primary guests */}
            {!guest.isPlusOne && (
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="plusOneAllowed">Allow Plus One</Label>
                  <Switch
                    id="plusOneAllowed"
                    checked={plusOneAllowed}
                    onCheckedChange={(checked) => {
                      setValue("plusOneAllowed", checked);
                      if (!checked) {
                        setValue("plusOneFirstName", "");
                        setValue("plusOneLastName", "");
                      }
                    }}
                  />
                </div>
                {plusOneAllowed && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plusOneFirstName">First Name</Label>
                      <Input
                        id="plusOneFirstName"
                        {...register("plusOneFirstName")}
                        placeholder="Leave blank if unknown"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plusOneLastName">Last Name</Label>
                      <Input
                        id="plusOneLastName"
                        {...register("plusOneLastName")}
                        placeholder="Leave blank if unknown"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Information */}
            <div className="border-t pt-4 mt-2 space-y-4">
              <h3 className="text-sm font-semibold">Contact Information</h3>

              <div className="space-y-2">
                <Label htmlFor="mailingAddress">Mailing Address</Label>
                <AddressAutocomplete
                  id="mailingAddress"
                  value={watch("mailingAddress") || ""}
                  onChange={(val) => setValue("mailingAddress", val)}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <PhoneInput
                    id="phoneNumber"
                    value={watch("phoneNumber")}
                    onChange={(value) => setValue("phoneNumber", value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <PhoneInput
                    id="whatsapp"
                    value={watch("whatsapp")}
                    onChange={(value) => setValue("whatsapp", value)}
                    international
                    placeholder="+1 (555) 123-4567 or +52 55 5506 7135"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Contact Method</Label>
                <Select
                  value={watch("preferredContactMethod") || "none"}
                  onValueChange={(
                    value:
                      | "none"
                      | "email"
                      | "text"
                      | "whatsapp"
                      | "phone_call",
                  ) =>
                    setValue(
                      "preferredContactMethod",
                      value === "none" ? "" : value,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone_call">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Language (Optional)</Label>
                <Select
                  value={watch("preferredLanguage") || "none"}
                  onValueChange={(value: "none" | "en" | "es") =>
                    setValue("preferredLanguage", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Use wedding default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use wedding default</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="physicalInviteSent">Physical Invite Sent</Label>
                <Switch
                  id="physicalInviteSent"
                  checked={physicalInviteSent}
                  onCheckedChange={(checked) =>
                    setValue("physicalInviteSent", checked)
                  }
                />
              </div>
            </div>

            {/* Admin-Only Fields */}
            <div className="border-t pt-4 mt-2 space-y-4">
              <h3 className="text-sm font-semibold">Admin Information</h3>

              {/* RSVP Status Override */}
              <div className="space-y-2">
                <Label>RSVP Status</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "pending", label: "Pending" },
                      { value: "yes", label: "Attending" },
                      { value: "no", label: "Declined" },
                    ] as const
                  ).map(({ value, label }) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={
                        localRsvpStatus === value ? "default" : "outline"
                      }
                      onClick={() => handleSetRsvp(value)}
                      disabled={isSettingRsvp || localRsvpStatus === value}
                      className="flex-1"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Invite Email Status Display */}
              <div className="flex items-center justify-between">
                <Label>Invite Email Status</Label>
                {guest.numberOfResends === 0 ? (
                  <Badge variant="secondary">No invite email sent</Badge>
                ) : guest.numberOfResends === 1 ? (
                  <Badge variant="default">Invite email sent</Badge>
                ) : (
                  <Badge variant="outline">
                    Sent {guest.numberOfResends} times
                  </Badge>
                )}
              </div>

              {/* Calendar Invite Status Display */}
              <div className="flex items-center justify-between">
                <Label>Calendar Invite Status</Label>
                {!guest.calendarInviteSent ? (
                  <Badge variant="secondary">No calendar invite sent</Badge>
                ) : guest.calendarInviteResendCount === 1 ? (
                  <Badge variant="default">Calendar invite sent</Badge>
                ) : (
                  <Badge variant="outline">
                    Sent {guest.calendarInviteResendCount} times
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="family">Family Member</Label>
                <Switch
                  id="family"
                  checked={family}
                  onCheckedChange={(checked) => setValue("family", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="under21">Under 21</Label>
                <Switch
                  id="under21"
                  checked={under21}
                  onCheckedChange={(checked) => setValue("under21", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="threeAndUnder">3 and Under</Label>
                <Switch
                  id="threeAndUnder"
                  checked={threeAndUnder}
                  onCheckedChange={(checked) => {
                    setValue("threeAndUnder", checked);
                    if (checked) {
                      setValue("under21", true);
                    }
                  }}
                />
              </div>

              {/* Travel Information Section */}
              <div className="border-t pt-4 mt-2 space-y-4">
                <h3 className="text-sm font-semibold">Travel Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                    <label className="text-sm font-medium">Arrival Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !watch("arrivalDate") && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch("arrivalDate")
                            ? format(
                                new Date(`${watch("arrivalDate")}T00:00:00`),
                                "MMM d, yyyy",
                              )
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            watch("arrivalDate")
                              ? new Date(`${watch("arrivalDate")}T00:00:00`)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(
                                2,
                                "0",
                              );
                              const dd = String(date.getDate()).padStart(
                                2,
                                "0",
                              );
                              setValue("arrivalDate", `${yyyy}-${mm}-${dd}`);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrivalTransport">Arrival Transport</Label>
                    <Input
                      id="arrivalTransport"
                      {...register("arrivalTransport")}
                      placeholder="e.g. SAN, LAX, Driving"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                    <label className="text-sm font-medium">
                      Departure Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !watch("departureDate") && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch("departureDate")
                            ? format(
                                new Date(`${watch("departureDate")}T00:00:00`),
                                "MMM d, yyyy",
                              )
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            watch("departureDate")
                              ? new Date(`${watch("departureDate")}T00:00:00`)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(
                                2,
                                "0",
                              );
                              const dd = String(date.getDate()).padStart(
                                2,
                                "0",
                              );
                              setValue("departureDate", `${yyyy}-${mm}-${dd}`);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departureTransport">
                      Departure Transport
                    </Label>
                    <Input
                      id="departureTransport"
                      {...register("departureTransport")}
                      placeholder="e.g. SAN, LAX, Driving"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accommodationNotes">Accommodation</Label>
                  <Input
                    id="accommodationNotes"
                    {...register("accommodationNotes")}
                    placeholder="e.g. Airbnb in La Jolla, staying with family"
                  />
                </div>
              </div>

              {/* Bridal Party Section */}
              <div className="border-t pt-4 mt-2 space-y-4">
                <h3 className="text-sm font-semibold">Bridal Party</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={watch("gender") || "none"}
                      onValueChange={(value: "none" | "male" | "female") => {
                        setValue("gender", value === "none" ? "" : value);
                        // Clear bridal party role if gender changes
                        if (value !== watch("gender")) {
                          setValue("bridalPartyRole", "");
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bridal Party Role</Label>
                    <Select
                      value={watch("bridalPartyRole") || "none"}
                      onValueChange={(
                        value:
                          | "none"
                          | "groomsman"
                          | "best_man"
                          | "bridesmaid"
                          | "maid_of_honor",
                      ) =>
                        setValue(
                          "bridalPartyRole",
                          value === "none" ? "" : value,
                        )
                      }
                      disabled={!watch("gender")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {watch("gender") === "male" && (
                          <>
                            <SelectItem value="groomsman">Groomsman</SelectItem>
                            <SelectItem value="best_man">Best Man</SelectItem>
                          </>
                        )}
                        {watch("gender") === "female" && (
                          <>
                            <SelectItem value="bridesmaid">
                              Bridesmaid
                            </SelectItem>
                            <SelectItem value="maid_of_honor">
                              Maid of Honor
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.bridalPartyRole && (
                      <p className="text-sm text-destructive">
                        {errors.bridalPartyRole.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Invitations */}
              {events.length > 0 && (
                <div className="border-t pt-4 mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Event Invitations</h3>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        if (selectedEventIds.length === events.length) {
                          setSelectedEventIds([]);
                        } else {
                          setSelectedEventIds(events.map((e) => e.id));
                        }
                      }}
                    >
                      {selectedEventIds.length === events.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between"
                      >
                        <label
                          htmlFor={`edit-event-${event.id}`}
                          className="text-sm"
                        >
                          {event.name}
                        </label>
                        <Switch
                          id={`edit-event-${event.id}`}
                          checked={selectedEventIds.includes(event.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEventIds((prev) => [
                                ...prev,
                                event.id,
                              ]);
                            } else {
                              setSelectedEventIds((prev) =>
                                prev.filter((id) => id !== event.id),
                              );
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Internal notes about this guest..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Footer with buttons - sticky on mobile */}
          <div className="shrink-0 space-y-4 pt-4 border-t bg-background">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailButtonClick}
                disabled={isResending || isSubmitting || !hasValidEmail}
                className="flex-1"
              >
                {isResending
                  ? "Sending..."
                  : guest.numberOfResends === 0
                    ? "Send Email"
                    : "Resend Email"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting || isSubmitting}
                className="flex-1"
              >
                Delete Guest
              </Button>
            </div>

            {/* Activities Email - only show for guests who RSVP'd yes */}
            {guest.rsvpStatus === "yes" && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendActivitiesEmail}
                disabled={isSendingActivities || isSubmitting || !hasValidEmail}
                className="w-full"
              >
                {isSendingActivities
                  ? "Sending..."
                  : guest.activitiesEmailSent
                    ? "Resend Activities Email"
                    : "Send Activities Email"}
              </Button>
            )}

            {/* Form Actions */}
            <SheetFooter className="gap-3 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeSheet}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !hasFormChanged}>
                {isSubmitting ? "Updating..." : "Update Guest"}
              </Button>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {guest.firstName} {guest.lastName || ""}
              </strong>{" "}
              and their RSVP information. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* B-List Email Confirmation Dialog */}
      <AlertDialog
        open={showBListEmailDialog}
        onOpenChange={setShowBListEmailDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send email to {currentList.toUpperCase()}-List guest?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>
                {guest.firstName} {guest.lastName || ""}
              </strong>{" "}
              is on the {currentList.toUpperCase()}-List. Are you sure you want
              to send them an invitation email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendEmail}>
              Yes, Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
