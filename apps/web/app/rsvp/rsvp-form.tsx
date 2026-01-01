"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@workspace/ui/components/switch";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import { type RSVPFormData, rsvpFormSchema } from "@/lib/validations/rsvp";
import { submitRSVP } from "./actions";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface RSVPFormProps {
  guests: Guest[];
  inviteCode: string;
  onBack: () => void;
  isMobile?: boolean;
}

export function RSVPForm({
  guests,
  inviteCode,
  onBack,
  isMobile,
}: RSVPFormProps) {
  const router = useRouter();

  const primaryGuest = guests.find((g) => !g.is_plus_one);
  const existingPlusOne = guests.find((g) => g.is_plus_one);
  const hasRSVPd = primaryGuest && primaryGuest.rsvp_status !== "pending";

  // Memoize initial values from DB to compare against current form values
  const initialValues = useMemo(
    (): RSVPFormData => ({
      firstName: primaryGuest?.first_name || "",
      lastName: primaryGuest?.last_name || "",
      attending: primaryGuest?.rsvp_status !== "no",
      plusOneAttending: existingPlusOne
        ? existingPlusOne.rsvp_status === "yes"
        : undefined,
      plusOneFirstName: existingPlusOne?.first_name || "",
      plusOneLastName: existingPlusOne?.last_name || "",
      plusOneEmail: existingPlusOne?.email || "",
      plusOnePhoneNumber: existingPlusOne?.phone_number || "",
      plusOneWhatsapp: existingPlusOne?.whatsapp || "",
      plusOnePreferredContactMethod:
        (existingPlusOne?.preferred_contact_method as RSVPFormData["plusOnePreferredContactMethod"]) ||
        "",
      plusOneDietaryRestrictions: existingPlusOne?.dietary_restrictions || "",
      dietaryRestrictions: primaryGuest?.dietary_restrictions || "",
      mailingAddress: primaryGuest?.mailing_address || "",
      phoneNumber: primaryGuest?.phone_number || "",
      whatsapp: primaryGuest?.whatsapp || "",
      preferredContactMethod:
        (primaryGuest?.preferred_contact_method as RSVPFormData["preferredContactMethod"]) ||
        "",
    }),
    [primaryGuest, existingPlusOne],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<RSVPFormData>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues: initialValues,
  });

  const attending = watch("attending");
  const plusOneAttending = watch("plusOneAttending");
  const hasPlusOne = primaryGuest?.plus_one_allowed || false;

  // Watch all form values to detect changes
  const formValues = watch();

  // Check if form has changed from initial DB values
  const hasFormChanged = useMemo(() => {
    // For new RSVPs, always allow submission
    if (!hasRSVPd) return true;

    // Compare each field
    const fieldsToCompare: (keyof RSVPFormData)[] = [
      "firstName",
      "lastName",
      "attending",
      "dietaryRestrictions",
      "mailingAddress",
      "phoneNumber",
      "whatsapp",
      "preferredContactMethod",
    ];

    // Add plus-one fields if applicable
    if (hasPlusOne) {
      fieldsToCompare.push(
        "plusOneAttending",
        "plusOneFirstName",
        "plusOneLastName",
        "plusOneEmail",
        "plusOnePhoneNumber",
        "plusOneWhatsapp",
        "plusOnePreferredContactMethod",
        "plusOneDietaryRestrictions",
      );
    }

    return fieldsToCompare.some((field) => {
      const initial = initialValues[field] ?? "";
      const current = formValues[field] ?? "";
      return initial !== current;
    });
  }, [formValues, initialValues, hasRSVPd, hasPlusOne]);

  async function onSubmit(data: RSVPFormData) {
    const result = await submitRSVP({
      inviteCode,
      firstName: data.firstName,
      lastName: data.lastName,
      attending: data.attending,
      plusOneAttending: data.plusOneAttending,
      plusOneFirstName: data.plusOneFirstName,
      plusOneLastName: data.plusOneLastName,
      plusOneEmail: data.plusOneEmail,
      plusOnePhoneNumber: data.plusOnePhoneNumber,
      plusOneWhatsapp: data.plusOneWhatsapp,
      plusOnePreferredContactMethod: data.plusOnePreferredContactMethod || null,
      plusOneDietaryRestrictions: data.plusOneDietaryRestrictions,
      dietaryRestrictions: data.dietaryRestrictions,
      mailingAddress: data.mailingAddress,
      phoneNumber: data.phoneNumber,
      whatsapp: data.whatsapp,
      preferredContactMethod: data.preferredContactMethod || null,
    });

    if (result.success) {
      toast.success(hasRSVPd ? "RSVP Updated!" : "RSVP Submitted!", {
        description: hasRSVPd
          ? "Your RSVP has been updated successfully."
          : "Thank you for your response. We can't wait to celebrate with you!",
      });
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit RSVP");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={isMobile ? "flex flex-col flex-1 min-h-0" : "space-y-6"}
    >
      <div
        className={
          isMobile ? "flex-1 overflow-y-auto px-4 py-4 space-y-6" : "space-y-6"
        }
      >
        {/* RSVP Status Banner - only show if previously submitted (not pending) */}
        {hasRSVPd && (
          <div
            className={`p-4 rounded-lg border-2 ${
              primaryGuest?.rsvp_status === "yes"
                ? "bg-green-50 dark:bg-green-900/20 border-green-500"
                : "bg-red-50 dark:bg-red-900/20 border-red-500"
            }`}
          >
            <p className="text-sm font-medium text-foreground">
              {primaryGuest?.rsvp_status === "yes"
                ? "✓ You've RSVP'd YES"
                : "✗ You've RSVP'd NO"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can update your RSVP anytime before the deadline
            </p>
          </div>
        )}

        {/* Your Name */}
        <div>
          <p className="text-sm font-medium mb-3">Your Name</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first-name" className="text-xs">
                First Name *
              </Label>
              <Input
                id="first-name"
                {...register("firstName")}
                placeholder="First name"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="last-name" className="text-xs">
                Last Name
              </Label>
              <Input
                id="last-name"
                {...register("lastName")}
                placeholder="Last name"
              />
            </div>
          </div>
        </div>

        {/* Plus One Information */}
        {hasPlusOne && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              ✓ You are invited to bring a plus-one!
            </p>
          </div>
        )}

        {/* Attendance */}
        <div>
          <label
            htmlFor="attendance-choice"
            className="block text-sm font-medium mb-3"
          >
            Will you be attending?
          </label>
          <input type="hidden" {...register("attending")} />
          <div id="attendance-choice" className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue("attending", true)}
              className={`p-4 rounded-lg border-2 transition-all ${
                attending
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-border hover:border-green-300"
              }`}
            >
              <p className="font-semibold">✓ Joyfully Accept</p>
            </button>
            <button
              type="button"
              onClick={() => setValue("attending", false)}
              className={`p-4 rounded-lg border-2 transition-all ${
                !attending
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-border hover:border-red-300"
              }`}
            >
              <p className="font-semibold">✗ Regretfully Decline</p>
            </button>
          </div>
        </div>

        {/* Plus-One Section (only if attending and has plus-one allowed) */}
        {attending && hasPlusOne && (
          <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="plus-one-attending"
                className="text-sm font-medium"
              >
                Will your plus-one be attending?
              </label>
              <Switch
                id="plus-one-attending"
                checked={plusOneAttending || false}
                onCheckedChange={(checked) =>
                  setValue("plusOneAttending", checked)
                }
              />
            </div>

            {plusOneAttending && (
              <div className="mt-4 space-y-4">
                {/* Plus-One Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="plus-one-first-name"
                      className="block text-sm font-medium mb-2"
                    >
                      First Name *
                    </label>
                    <Input
                      id="plus-one-first-name"
                      {...register("plusOneFirstName")}
                      placeholder="First name"
                      className="bg-white dark:bg-gray-800"
                    />
                    {errors.plusOneFirstName && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.plusOneFirstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="plus-one-last-name"
                      className="block text-sm font-medium mb-2"
                    >
                      Last Name
                    </label>
                    <Input
                      id="plus-one-last-name"
                      {...register("plusOneLastName")}
                      placeholder="Last name"
                      className="bg-white dark:bg-gray-800"
                    />
                    {errors.plusOneLastName && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.plusOneLastName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Plus-One Contact Information */}
                <div className="pt-3 border-t border-purple-200">
                  <p className="text-sm font-medium mb-3">
                    Plus-One Contact Information (Optional)
                  </p>
                  <div className="space-y-3">
                    {/* Email */}
                    <div>
                      <label
                        htmlFor="plus-one-email"
                        className="block text-xs font-medium mb-1"
                      >
                        Email
                      </label>
                      <Input
                        id="plus-one-email"
                        type="email"
                        {...register("plusOneEmail")}
                        placeholder="email@example.com"
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label
                        htmlFor="plus-one-phone"
                        className="block text-xs font-medium mb-1"
                      >
                        Phone Number
                      </label>
                      <PhoneInput
                        id="plus-one-phone"
                        value={watch("plusOnePhoneNumber") || ""}
                        onChange={(value) =>
                          setValue("plusOnePhoneNumber", value)
                        }
                        placeholder="(555) 123-4567"
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label
                        htmlFor="plus-one-whatsapp"
                        className="block text-xs font-medium mb-1"
                      >
                        WhatsApp
                      </label>
                      <PhoneInput
                        id="plus-one-whatsapp"
                        value={watch("plusOneWhatsapp") || ""}
                        onChange={(value) => setValue("plusOneWhatsapp", value)}
                        international
                        placeholder="+1 (555) 123-4567"
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>

                    {/* Preferred Contact Method */}
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Preferred Contact Method
                      </Label>
                      <Select
                        value={watch("plusOnePreferredContactMethod") || "none"}
                        onValueChange={(
                          value:
                            | "none"
                            | "email"
                            | "text"
                            | "whatsapp"
                            | "phone_call",
                        ) =>
                          setValue(
                            "plusOnePreferredContactMethod",
                            value === "none" ? "" : value,
                          )
                        }
                      >
                        <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select a method</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="text">Text Message</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="phone_call">Phone Call</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dietary Restrictions */}
                    <div>
                      <label
                        htmlFor="plus-one-dietary-restrictions"
                        className="block text-xs font-medium mb-1"
                      >
                        Dietary Restrictions
                      </label>
                      <Input
                        id="plus-one-dietary-restrictions"
                        {...register("plusOneDietaryRestrictions")}
                        placeholder="e.g., Vegetarian, Gluten-free, Allergies..."
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dietary Restrictions (only if attending) */}
        {attending && (
          <div>
            <label
              htmlFor="dietary-restrictions"
              className="block text-sm font-medium mb-2"
            >
              Your Dietary Restrictions (Optional)
            </label>
            <Input
              id="dietary-restrictions"
              {...register("dietaryRestrictions")}
              placeholder="e.g., Vegetarian, Gluten-free, Allergies..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              For you (primary guest)
              {hasPlusOne && plusOneAttending
                ? ". Plus-one dietary restrictions are in their contact information section above."
                : ""}
            </p>
          </div>
        )}

        {/* Contact Information Section */}
        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Help us stay in touch! This information is optional but helpful.
          </p>

          <div className="space-y-4">
            {/* Mailing Address */}
            <div>
              <label
                htmlFor="mailing-address"
                className="block text-sm font-medium mb-2"
              >
                Mailing Address (Optional)
              </label>
              <Input
                id="mailing-address"
                {...register("mailingAddress")}
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone-number"
                className="block text-sm font-medium mb-2"
              >
                Phone Number (Optional)
              </label>
              <PhoneInput
                id="phone-number"
                value={watch("phoneNumber") || ""}
                onChange={(value) => setValue("phoneNumber", value)}
                placeholder="(555) 123-4567"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label
                htmlFor="whatsapp"
                className="block text-sm font-medium mb-2"
              >
                WhatsApp (Optional)
              </label>
              <PhoneInput
                id="whatsapp"
                value={watch("whatsapp") || ""}
                onChange={(value) => setValue("whatsapp", value)}
                international
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Preferred Contact Method */}
            <div className="space-y-2">
              <Label>Preferred Contact Method (Optional)</Label>
              <Select
                value={watch("preferredContactMethod") || "none"}
                onValueChange={(
                  value: "none" | "email" | "text" | "whatsapp" | "phone_call",
                ) =>
                  setValue(
                    "preferredContactMethod",
                    value === "none" ? "" : value,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a method</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div
        className={
          isMobile
            ? "flex-shrink-0 flex gap-3 p-4 border-t border-border bg-background"
            : "flex gap-3 pt-4"
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !hasFormChanged}
          className="flex-1"
        >
          {isSubmitting
            ? "Submitting..."
            : hasRSVPd
              ? "Update RSVP"
              : "Submit RSVP"}
        </Button>
      </div>
    </form>
  );
}
