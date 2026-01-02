"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import {
  type EditGuestFormData,
  editGuestSchema,
} from "@/lib/validations/guest";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface EditGuestSheetProps {
  guest: Guest;
  plusOne: Guest | null;
}

export function EditGuestSheet({ guest, plusOne }: EditGuestSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBListEmailDialog, setShowBListEmailDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Memoize initial values from DB to compare against current form values
  const initialValues = useMemo(
    (): EditGuestFormData => ({
      firstName: guest.first_name,
      lastName: guest.last_name || "",
      email: guest.email || "",
      side: (guest.side || "bride") as "bride" | "groom" | "both",
      list: guest.list as "a" | "b" | "c",
      plusOneAllowed: guest.plus_one_allowed || false,
      plusOneFirstName: plusOne?.first_name || "",
      plusOneLastName: plusOne?.last_name || "",
      mailingAddress: guest.mailing_address || "",
      physicalInviteSent: guest.physical_invite_sent || false,
      phoneNumber: guest.phone_number || "",
      whatsapp: guest.whatsapp || "",
      preferredContactMethod: (guest.preferred_contact_method || "") as
        | "email"
        | "text"
        | "whatsapp"
        | "phone_call"
        | "",
      family: guest.family || false,
      under21: guest.under_21 || false,
      notes: guest.notes || "",
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
      "family",
      "under21",
      "notes",
    ];

    return fieldsToCompare.some((field) => {
      const initial = initialValues[field] ?? "";
      const current = formValues[field] ?? "";
      return initial !== current;
    });
  }, [formValues, initialValues]);

  function closeSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.push(`/admin/guests?${params.toString()}`, { scroll: false });
  }

  async function onSubmit(data: EditGuestFormData) {
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/guests?id=${guest.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Guest deleted", {
          description:
            `${guest.first_name} ${guest.last_name || ""} has been removed`.trim(),
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
        <SheetHeader className="flex-shrink-0">
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

            {/* Plus One Section - Only show for primary guests */}
            {!guest.is_plus_one && (
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
                <Input
                  id="mailingAddress"
                  {...register("mailingAddress")}
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

              {/* Email Status Display */}
              <div className="flex items-center justify-between">
                <Label>Email Status</Label>
                {guest.number_of_resends === 0 ? (
                  <Badge variant="secondary">No email sent</Badge>
                ) : guest.number_of_resends === 1 ? (
                  <Badge variant="default">Email sent</Badge>
                ) : (
                  <Badge variant="outline">
                    Sent {guest.number_of_resends} times
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
          <div className="flex-shrink-0 space-y-4 pt-4 border-t bg-background">
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
                  : guest.number_of_resends === 0
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
                {guest.first_name} {guest.last_name || ""}
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
                {guest.first_name} {guest.last_name || ""}
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
