"use client";

function toDateInput(val: unknown): string {
  if (!val) return "";
  try {
    return new Date(val as string | Date).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

import { zodResolver } from "@hookform/resolvers/zod";
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
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import {
  type MultiGuestRsvpFormData,
  multiGuestRsvpSchema,
} from "@/lib/validations/rsvp";
import type { RsvpGuest } from "./actions";
import { submitMultiGuestRSVP } from "./actions";
import { GuestRsvpCard } from "./guest-rsvp-card";

interface RSVPFormProps {
  guests: RsvpGuest[];
  inviteCode: string;
  onBack: () => void;
}

export function RSVPForm({ guests, inviteCode, onBack }: RSVPFormProps) {
  const router = useRouter();
  const slug = useWeddingSlug();

  // Separate primary guests from plus-ones
  const primaryGuests = guests.filter((g) => !g.isPlusOne);
  const plusOnes = guests.filter((g) => g.isPlusOne);

  // Check if any guest has already RSVP'd
  const hasRSVPd = primaryGuests.some((g) => g.rsvpStatus !== "pending");

  // Get first non-plus-one guest for contact info defaults
  const firstGuest = primaryGuests[0];

  // Find plus-one for a specific guest
  const findPlusOneFor = useCallback(
    (guestId: string) => plusOnes.find((p) => p.primaryGuestId === guestId),
    [plusOnes],
  );

  // Memoize initial values from DB to compare against current form values
  const initialValues = useMemo((): MultiGuestRsvpFormData => {
    return {
      guests: primaryGuests.map((guest) => {
        const existingPlusOne = plusOnes.find(
          (p) => p.primaryGuestId === guest.id,
        );
        return {
          guestId: guest.id,
          firstName: guest.firstName || "",
          lastName: guest.lastName || "",
          attending: guest.rsvpStatus !== "no",
          dietaryRestrictions: guest.dietaryRestrictions || "",
          under21: guest.under21 || false,
          threeAndUnder: guest.threeAndUnder || false,
          plusOneAllowed: guest.plusOneAllowed || false,
          existingPlusOneId: existingPlusOne?.id,
          plusOneAttending: existingPlusOne
            ? existingPlusOne.rsvpStatus === "yes"
            : false,
          plusOneFirstName: existingPlusOne?.firstName || "",
          plusOneLastName: existingPlusOne?.lastName || "",
          plusOneDietaryRestrictions:
            existingPlusOne?.dietaryRestrictions || "",
          plusOneUnder21: existingPlusOne?.under21 || false,
          plusOneThreeAndUnder: existingPlusOne?.threeAndUnder || false,
        };
      }),
      mailingAddress: firstGuest?.mailingAddress || "",
      phoneNumber: firstGuest?.phoneNumber || "",
      whatsapp: firstGuest?.whatsapp || "",
      preferredContactMethod:
        (firstGuest?.preferredContactMethod as MultiGuestRsvpFormData["preferredContactMethod"]) ||
        "",
      arrivalDate: toDateInput(firstGuest?.arrivalDate),
      arrivalTransport: firstGuest?.arrivalTransport || "",
      departureDate: toDateInput(firstGuest?.departureDate),
      departureTransport: firstGuest?.departureTransport || "",
      accommodationNotes: firstGuest?.accommodationNotes || "",
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

  const canSubmit = !isSubmitting;

  async function onSubmit(data: MultiGuestRsvpFormData) {
    const result = await submitMultiGuestRSVP({
      inviteCode,
      guests: data.guests,
      mailingAddress: data.mailingAddress,
      phoneNumber: data.phoneNumber,
      whatsapp: data.whatsapp,
      preferredContactMethod: data.preferredContactMethod || undefined,
      arrivalDate: data.arrivalDate,
      arrivalTransport: data.arrivalTransport,
      departureDate: data.departureDate,
      departureTransport: data.departureTransport,
      accommodationNotes: data.accommodationNotes,
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
        router.push(`/${slug}/things-to-do`);
      } else {
        router.refresh();
      }
    } else {
      toast.error(result.error || "Failed to submit RSVP");
    }
  }

  const anyAttending = formValues.guests.some((g) => g.attending);

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
              href={`/${slug}/things-to-do`}
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
              <AddressAutocomplete
                id="mailing-address"
                value={watch("mailingAddress") || ""}
                onChange={(val) => setValue("mailingAddress", val)}
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

        {/* Travel Information Section - only when someone is attending */}
        {anyAttending && (
          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">
              Travel Information (Optional)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Let us know when you're arriving so we can coordinate!
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                  <label className="block text-sm font-medium mb-2">
                    Arrival Date
                  </label>
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
                            const dd = String(date.getDate()).padStart(2, "0");
                            setValue("arrivalDate", `${yyyy}-${mm}-${dd}`);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label
                    htmlFor="arrival-transport"
                    className="block text-sm font-medium mb-2"
                  >
                    How are you getting here?
                  </label>
                  <Input
                    id="arrival-transport"
                    {...register("arrivalTransport")}
                    placeholder="e.g. SAN, LAX, Driving"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                  <label className="block text-sm font-medium mb-2">
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
                            const dd = String(date.getDate()).padStart(2, "0");
                            setValue("departureDate", `${yyyy}-${mm}-${dd}`);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label
                    htmlFor="departure-transport"
                    className="block text-sm font-medium mb-2"
                  >
                    Departure Transport
                  </label>
                  <Input
                    id="departure-transport"
                    {...register("departureTransport")}
                    placeholder="e.g. SAN, LAX, Driving"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="accommodation-notes"
                  className="block text-sm font-medium mb-2"
                >
                  Where are you staying? (Optional)
                </label>
                <AddressAutocomplete
                  id="accommodation-notes"
                  value={watch("accommodationNotes") || ""}
                  onChange={(val) => setValue("accommodationNotes", val)}
                  placeholder="e.g. Airbnb in La Jolla, Hotel del Coronado"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="shrink-0 flex gap-3 p-4 border-t border-border bg-background md:border-t-0 md:p-0 md:pt-4 md:bg-transparent">
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
          disabled={isSubmitting || !canSubmit}
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
