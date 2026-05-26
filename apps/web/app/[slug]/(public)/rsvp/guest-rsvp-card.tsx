"use client";

import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type { MultiGuestRsvpFormData } from "@/lib/validations/rsvp";
import type { RsvpGuest } from "./actions";

interface GuestRsvpCardProps {
  index: number;
  guest: RsvpGuest;
  existingPlusOne?: RsvpGuest;
  register: UseFormRegister<MultiGuestRsvpFormData>;
  watch: UseFormWatch<MultiGuestRsvpFormData>;
  setValue: UseFormSetValue<MultiGuestRsvpFormData>;
  errors: FieldErrors<MultiGuestRsvpFormData>;
}

export function GuestRsvpCard({
  index,
  guest,
  register,
  watch,
  setValue,
  errors,
}: GuestRsvpCardProps) {
  const attending = watch(`guests.${index}.attending`);
  const plusOneAttending = watch(`guests.${index}.plusOneAttending`);
  const hasPlusOne = guest.plusOneAllowed;

  const guestErrors = errors.guests?.[index];

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      {/* Guest Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {guest.firstName} {guest.lastName || ""}
        </h3>
        {hasPlusOne && (
          <p className="text-sm text-green-600 dark:text-green-400">
            + Plus-one allowed
          </p>
        )}
      </div>

      {/* Guest Name Fields */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label
            htmlFor={`guest-${index}-first-name`}
            className="block text-xs font-medium mb-1"
          >
            First Name *
          </label>
          <Input
            id={`guest-${index}-first-name`}
            {...register(`guests.${index}.firstName`)}
            placeholder="First name"
          />
          {guestErrors?.firstName && (
            <p className="text-sm text-red-600 mt-1">
              {guestErrors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`guest-${index}-last-name`}
            className="block text-xs font-medium mb-1"
          >
            Last Name
          </label>
          <Input
            id={`guest-${index}-last-name`}
            {...register(`guests.${index}.lastName`)}
            placeholder="Last name"
          />
        </div>
      </div>

      {/* Attendance Buttons */}
      <div className="mb-4">
        <p className="block text-sm font-medium mb-2">Will you be attending?</p>
        <input type="hidden" {...register(`guests.${index}.attending`)} />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue(`guests.${index}.attending`, true)}
            className={`p-3 rounded-lg border-2 transition-all ${
              attending
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-border hover:border-green-300"
            }`}
          >
            <p className="font-semibold text-sm">Joyfully Accept</p>
          </button>
          <button
            type="button"
            onClick={() => setValue(`guests.${index}.attending`, false)}
            className={`p-3 rounded-lg border-2 transition-all ${
              !attending
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-border hover:border-red-300"
            }`}
          >
            <p className="font-semibold text-sm">Regretfully Decline</p>
          </button>
        </div>
      </div>

      {/* Attending-only fields */}
      {attending && (
        <div className="space-y-4 pt-4 border-t border-border">
          {/* Dietary Restrictions */}
          <div>
            <label
              htmlFor={`guest-${index}-dietary`}
              className="block text-sm font-medium mb-2"
            >
              Dietary Restrictions (Optional)
            </label>
            <Input
              id={`guest-${index}-dietary`}
              {...register(`guests.${index}.dietaryRestrictions`)}
              placeholder="e.g., Vegetarian, Gluten-free, Allergies..."
            />
          </div>

          {/* Under 21 Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <label
                htmlFor={`guest-${index}-under21`}
                className="text-sm font-medium"
              >
                Under 21?
              </label>
              <p className="text-xs text-muted-foreground">
                For beverage planning
              </p>
            </div>
            <Switch
              id={`guest-${index}-under21`}
              checked={watch(`guests.${index}.under21`) || false}
              onCheckedChange={(checked) =>
                setValue(`guests.${index}.under21`, checked)
              }
            />
          </div>

          {/* 3 and Under Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <label
                htmlFor={`guest-${index}-three-and-under`}
                className="text-sm font-medium"
              >
                3 or under?
              </label>
              <p className="text-xs text-muted-foreground">
                For meal and seating planning
              </p>
            </div>
            <Switch
              id={`guest-${index}-three-and-under`}
              checked={watch(`guests.${index}.threeAndUnder`) || false}
              onCheckedChange={(checked) => {
                setValue(`guests.${index}.threeAndUnder`, checked);
                if (checked) {
                  setValue(`guests.${index}.under21`, true);
                }
              }}
            />
          </div>

          {/* Plus-One Section */}
          {hasPlusOne && (
            <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor={`guest-${index}-plus-one-attending`}
                  className="text-sm font-medium"
                >
                  Will your plus-one be attending?
                </label>
                <Switch
                  id={`guest-${index}-plus-one-attending`}
                  checked={plusOneAttending || false}
                  onCheckedChange={(checked) =>
                    setValue(`guests.${index}.plusOneAttending`, checked)
                  }
                />
              </div>

              {plusOneAttending && (
                <div className="mt-4 space-y-4">
                  {/* Plus-One Name Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`guest-${index}-plus-one-first-name`}
                        className="block text-sm font-medium mb-2"
                      >
                        First Name *
                      </label>
                      <Input
                        id={`guest-${index}-plus-one-first-name`}
                        {...register(`guests.${index}.plusOneFirstName`)}
                        placeholder="First name"
                        className="bg-white dark:bg-gray-800"
                      />
                      {guestErrors?.plusOneFirstName && (
                        <p className="text-sm text-red-600 mt-1">
                          {guestErrors.plusOneFirstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`guest-${index}-plus-one-last-name`}
                        className="block text-sm font-medium mb-2"
                      >
                        Last Name
                      </label>
                      <Input
                        id={`guest-${index}-plus-one-last-name`}
                        {...register(`guests.${index}.plusOneLastName`)}
                        placeholder="Last name"
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  {/* Plus-One Dietary Restrictions */}
                  <div>
                    <label
                      htmlFor={`guest-${index}-plus-one-dietary`}
                      className="block text-sm font-medium mb-2"
                    >
                      Dietary Restrictions
                    </label>
                    <Input
                      id={`guest-${index}-plus-one-dietary`}
                      {...register(
                        `guests.${index}.plusOneDietaryRestrictions`,
                      )}
                      placeholder="e.g., Vegetarian, Gluten-free..."
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>

                  {/* Plus-One Under 21 Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/50 dark:bg-gray-800/50">
                    <label
                      htmlFor={`guest-${index}-plus-one-under21`}
                      className="text-xs font-medium"
                    >
                      Is your plus-one under 21?
                    </label>
                    <Switch
                      id={`guest-${index}-plus-one-under21`}
                      checked={watch(`guests.${index}.plusOneUnder21`) || false}
                      onCheckedChange={(checked) =>
                        setValue(`guests.${index}.plusOneUnder21`, checked)
                      }
                    />
                  </div>

                  {/* Plus-One 3 and Under Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/50 dark:bg-gray-800/50">
                    <label
                      htmlFor={`guest-${index}-plus-one-three-and-under`}
                      className="text-xs font-medium"
                    >
                      Is your plus-one 3 or under?
                    </label>
                    <Switch
                      id={`guest-${index}-plus-one-three-and-under`}
                      checked={
                        watch(`guests.${index}.plusOneThreeAndUnder`) || false
                      }
                      onCheckedChange={(checked) => {
                        setValue(
                          `guests.${index}.plusOneThreeAndUnder`,
                          checked,
                        );
                        if (checked) {
                          setValue(`guests.${index}.plusOneUnder21`, true);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
