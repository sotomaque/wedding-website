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
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
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
        toast({
          title: "Guest updated!",
          description:
            `${data.firstName} ${data.lastName || ""} has been updated`.trim(),
        });
        closeSheet();
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update guest",
        });
      }
    } catch (error) {
      console.error("Error updating guest:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update guest",
      });
    }
  }

  async function handleResendEmail() {
    setIsResending(true);
    try {
      const response = await fetch("/api/admin/guests/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id }),
      });

      if (response.ok) {
        toast({
          title: "Email sent!",
          description: `Invitation email resent to ${guest.email}`,
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to resend email",
        });
      }
    } catch (error) {
      console.error("Error resending email:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend email",
      });
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
        toast({
          title: "Guest deleted",
          description:
            `${guest.first_name} ${guest.last_name || ""} has been removed`.trim(),
        });
        setShowDeleteDialog(false);
        closeSheet();
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete guest",
        });
      }
    } catch (error) {
      console.error("Error deleting guest:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete guest",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Sheet open onOpenChange={closeSheet}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-serif">Edit Guest</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium mb-1"
                >
                  First Name *
                </label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium mb-1"
                >
                  Last Name
                </label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email *
              </label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="side"
                  className="block text-sm font-medium mb-1"
                >
                  Side
                </label>
                <select
                  id="side"
                  {...register("side")}
                  className="w-full border rounded px-3 py-2 bg-background"
                >
                  <option value="bride">Bride</option>
                  <option value="groom">Groom</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="list"
                  className="block text-sm font-medium mb-1"
                >
                  List
                </label>
                <select
                  id="list"
                  {...register("list")}
                  className="w-full border rounded px-3 py-2 bg-background"
                >
                  <option value="a">A List</option>
                  <option value="b">B List</option>
                  <option value="c">C List</option>
                </select>
              </div>
            </div>

            {/* Plus One Section - Only show for primary guests */}
            {!guest.is_plus_one && (
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="plusOneAllowed"
                    className="text-sm font-medium"
                  >
                    Allow Plus One
                  </label>
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
                    <div>
                      <label
                        htmlFor="plusOneFirstName"
                        className="block text-sm font-medium mb-1"
                      >
                        First Name
                      </label>
                      <Input
                        id="plusOneFirstName"
                        {...register("plusOneFirstName")}
                        placeholder="Leave blank if unknown"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="plusOneLastName"
                        className="block text-sm font-medium mb-1"
                      >
                        Last Name
                      </label>
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

              <div>
                <label
                  htmlFor="mailingAddress"
                  className="block text-sm font-medium mb-1"
                >
                  Mailing Address
                </label>
                <Input
                  id="mailingAddress"
                  {...register("mailingAddress")}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium mb-1"
                  >
                    Phone Number
                  </label>
                  <PhoneInput
                    id="phoneNumber"
                    value={watch("phoneNumber")}
                    onChange={(value) => setValue("phoneNumber", value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label
                    htmlFor="whatsapp"
                    className="block text-sm font-medium mb-1"
                  >
                    WhatsApp
                  </label>
                  <PhoneInput
                    id="whatsapp"
                    value={watch("whatsapp")}
                    onChange={(value) => setValue("whatsapp", value)}
                    international
                    placeholder="+1 (555) 123-4567 or +52 55 5506 7135"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="preferredContactMethod"
                  className="block text-sm font-medium mb-1"
                >
                  Preferred Contact Method
                </label>
                <select
                  id="preferredContactMethod"
                  {...register("preferredContactMethod")}
                  className="w-full border rounded px-3 py-2 bg-background"
                >
                  <option value="">Not specified</option>
                  <option value="email">Email</option>
                  <option value="text">Text Message</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone_call">Phone Call</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label
                  htmlFor="physicalInviteSent"
                  className="text-sm font-medium"
                >
                  Physical Invite Sent
                </label>
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
                <span className="text-sm font-medium">Email Status</span>
                {guest.number_of_resends === 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    No email sent
                  </span>
                ) : guest.number_of_resends === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Email sent
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Sent {guest.number_of_resends} times
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="family" className="text-sm font-medium">
                  Family Member
                </label>
                <Switch
                  id="family"
                  checked={family}
                  onCheckedChange={(checked) => setValue("family", checked)}
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium mb-1"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Internal notes about this guest..."
                  rows={3}
                  className="w-full border rounded px-3 py-2 bg-background resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="space-y-4 pt-4 border-t">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendEmail}
                disabled={isResending || isSubmitting}
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
    </Sheet>
  );
}
