"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type AddGuestFormData, addGuestSchema } from "@/lib/validations/guest";

interface AddGuestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddGuestForm({ open, onClose, onSuccess }: AddGuestFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddGuestFormData>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      side: "bride",
      list: "a",
      plusOneAllowed: false,
      plusOneFirstName: "",
      plusOneLastName: "",
      sendEmail: false,
      mailingAddress: "",
      phoneNumber: "",
      whatsapp: "",
      preferredContactMethod: "",
      family: false,
      under21: false,
      notes: "",
    },
  });

  const plusOneAllowed = watch("plusOneAllowed");
  const plusOneFirstName = watch("plusOneFirstName");
  const email = watch("email");
  const family = watch("family");
  const under21 = watch("under21");

  async function onSubmit(data: AddGuestFormData) {
    try {
      const response = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("Guest created!", {
          description:
            `${data.firstName} ${data.lastName || ""} has been added to the guest list`.trim(),
        });
        onSuccess();
      } else {
        toast.error("Error", {
          description: "Failed to create guest",
        });
      }
    } catch (error) {
      console.error("Error creating guest:", error);
      toast.error("Error", {
        description: "Failed to create guest",
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-serif">Add New Guest</SheetTitle>
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
                Email (Optional)
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

            {/* Plus One Section */}
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="plusOneAllowed" className="text-sm font-medium">
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
                      disabled={!plusOneFirstName}
                    />
                  </div>
                </div>
              )}
            </div>

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
                  <option value="">Select method...</option>
                  <option value="email">Email</option>
                  <option value="text">Text Message</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone_call">Phone Call</option>
                </select>
              </div>
            </div>

            {/* Admin-Only Fields */}
            <div className="border-t pt-4 mt-2 space-y-4">
              <h3 className="text-sm font-semibold">Admin Information</h3>

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

              <div className="flex items-center justify-between">
                <label htmlFor="under21" className="text-sm font-medium">
                  Under 21
                </label>
                <Switch
                  id="under21"
                  checked={under21}
                  onCheckedChange={(checked) => setValue("under21", checked)}
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

            {/* Send Email Option */}
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sendEmail" className="text-sm font-medium">
                  Send invitation email
                </label>
                <Switch
                  id="sendEmail"
                  checked={watch("sendEmail")}
                  onCheckedChange={(checked) => setValue("sendEmail", checked)}
                  disabled={!email || email.trim() === ""}
                />
              </div>
              {(!email || email.trim() === "") && (
                <p className="text-xs text-muted-foreground mt-1">
                  Email address required to send invitation
                </p>
              )}
            </div>
          </div>

          {/* Footer with buttons */}
          <SheetFooter className="gap-3 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Guest"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
