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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import {
  type MultiGuestRsvpFormData,
  multiGuestRsvpSchema,
} from "@/lib/validations/rsvp";
import { submitMultiGuestRSVP } from "./actions";
import { GuestRsvpCard } from "./guest-rsvp-card";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface RSVPFormProps {
  guests: Guest[];
  inviteCode: string;
  onBack: () => void;
}

export function RSVPForm({ guests, inviteCode, onBack }: RSVPFormProps) {
  const router = useRouter();

  // Separate primary guests from plus-ones
  const primaryGuests = guests.filter((g) => !g.is_plus_one);
  const plusOnes = guests.filter((g) => g.is_plus_one);

  // Check if any guest has already RSVP'd
  const hasRSVPd = primaryGuests.some((g) => g.rsvp_status !== "pending");

  // Get first non-plus-one guest for contact info defaults
  const firstGuest = primaryGuests[0];

  // Find plus-one for a specific guest
  const findPlusOneFor = (guestId: string) =>
    plusOnes.find((p) => p.primary_guest_id === guestId);

  // Memoize initial values from DB to compare against current form values
  const initialValues = useMemo((): MultiGuestRsvpFormData => {
    return {
      guests: primaryGuests.map((guest) => {
        const existingPlusOne = plusOnes.find(
          (p) => p.primary_guest_id === guest.id,
        );
        return {
          guestId: guest.id,
          firstName: guest.first_name || "",
          lastName: guest.last_name || "",
          attending: guest.rsvp_status !== "no",
          dietaryRestrictions: guest.dietary_restrictions || "",
          under21: guest.under_21 || false,
          threeAndUnder: guest.three_and_under || false,
          plusOneAllowed: guest.plus_one_allowed || false,
          existingPlusOneId: existingPlusOne?.id,
          plusOneAttending: existingPlusOne
            ? existingPlusOne.rsvp_status === "yes"
            : false,
          plusOneFirstName: existingPlusOne?.first_name || "",
          plusOneLastName: existingPlusOne?.last_name || "",
          plusOneDietaryRestrictions:
            existingPlusOne?.dietary_restrictions || "",
          plusOneUnder21: existingPlusOne?.under_21 || false,
          plusOneThreeAndUnder: existingPlusOne?.three_and_under || false,
        };
      }),
      mailingAddress: firstGuest?.mailing_address || "",
      phoneNumber: firstGuest?.phone_number || "",
      whatsapp: firstGuest?.whatsapp || "",
      preferredContactMethod:
        (firstGuest?.preferred_contact_method as MultiGuestRsvpFormData["preferredContactMethod"]) ||
        "",
    };
  }, [primaryGuests, firstGuest, plusOnes]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<MultiGuestRsvpFormData>({
    resolver: zodResolver(multiGuestRsvpSchema),
    defaultValues: initialValues,
  });

  // Watch all form values to detect changes
  const formValues = watch();

  // Check if form has changed from initial DB values
  const hasFormChanged = useMemo(() => {
    // For new RSVPs, always allow submission
    if (!hasRSVPd) return true;

    // Deep compare guests array
    const initialGuests = initialValues.guests;
    const currentGuests = formValues.guests;

    if (initialGuests.length !== currentGuests.length) return true;

    for (let i = 0; i < initialGuests.length; i++) {
      const initial = initialGuests[i];
      const current = currentGuests[i];

      if (!initial || !current) return true;

      // Compare each field
      if (
        initial.firstName !== current.firstName ||
        initial.lastName !== current.lastName ||
        initial.attending !== current.attending ||
        initial.dietaryRestrictions !== current.dietaryRestrictions ||
        initial.under21 !== current.under21 ||
        initial.threeAndUnder !== current.threeAndUnder ||
        initial.plusOneAttending !== current.plusOneAttending ||
        initial.plusOneFirstName !== current.plusOneFirstName ||
        initial.plusOneLastName !== current.plusOneLastName ||
        initial.plusOneDietaryRestrictions !==
          current.plusOneDietaryRestrictions ||
        initial.plusOneUnder21 !== current.plusOneUnder21 ||
        initial.plusOneThreeAndUnder !== current.plusOneThreeAndUnder
      ) {
        return true;
      }
    }

    // Compare contact info
    if (
      initialValues.mailingAddress !== formValues.mailingAddress ||
      initialValues.phoneNumber !== formValues.phoneNumber ||
      initialValues.whatsapp !== formValues.whatsapp ||
      initialValues.preferredContactMethod !== formValues.preferredContactMethod
    ) {
      return true;
    }

    return false;
  }, [formValues, initialValues, hasRSVPd]);

  async function onSubmit(data: MultiGuestRsvpFormData) {
    const result = await submitMultiGuestRSVP({
      inviteCode,
      guests: data.guests,
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
      // Redirect to things-to-do page for first-time RSVPs with at least one attending
      const anyAttending = data.guests.some((g) => g.attending);
      if (!hasRSVPd && anyAttending) {
        router.push("/things-to-do");
      } else {
        router.refresh();
      }
    } else {
      toast.error(result.error || "Failed to submit RSVP");
    }
  }

  // Calculate attending summary
  const attendingCount = formValues.guests.filter((g) => g.attending).length;
  const totalGuests = formValues.guests.length;
  const plusOneCount = formValues.guests.filter(
    (g) => g.attending && g.plusOneAllowed && g.plusOneAttending,
  ).length;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col flex-1 min-h-0 md:block md:space-y-6"
    >
      <div className="flex-1 overflow-y-auto overscroll-none px-4 py-4 space-y-6 md:flex-none md:overflow-visible md:overscroll-auto md:px-0 md:py-0">
        {/* Things to Do Link - mobile only */}
        <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg md:hidden">
          <p className="text-xs text-center text-foreground">
            Planning your trip to San Diego?{" "}
            <Link
              href="/things-to-do"
              className="font-semibold underline hover:text-accent transition-colors"
            >
              Check out Things to Do
            </Link>
          </p>
        </div>

        {/* RSVP Status Banner - only show if previously submitted */}
        {hasRSVPd && (
          <div className="p-4 rounded-lg border-2 bg-blue-50 dark:bg-blue-900/20 border-blue-500">
            <p className="text-sm font-medium text-foreground">
              You've already submitted your RSVP
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can update your response anytime before the deadline
            </p>
          </div>
        )}

        {/* Attendance Summary */}
        {totalGuests > 1 && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">
              {attendingCount} of {totalGuests} guests attending
              {plusOneCount > 0 && ` (+${plusOneCount} plus-ones)`}
            </p>
          </div>
        )}

        {/* Guest Cards */}
        <div className="space-y-4">
          {primaryGuests.map((guest, index) => (
            <GuestRsvpCard
              key={guest.id}
              index={index}
              guest={guest}
              existingPlusOne={findPlusOneFor(guest.id)}
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Children 3 and under are welcome to attend and do not need to be
          listed.
        </p>

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
      <div className="flex-shrink-0 flex gap-3 p-4 border-t border-border bg-background md:border-t-0 md:p-0 md:pt-4 md:bg-transparent">
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
