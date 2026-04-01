"use client";

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
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import type { EventOption, PartyOption } from "./actions";

/**
 * Shared form field sections for Add Guest and Edit Guest forms.
 *
 * Both forms use react-hook-form with similar schemas. These sections
 * accept the form's register/watch/setValue/errors and render the fields.
 * This eliminates ~400 lines of duplication between the two forms.
 */

// biome-ignore lint/suspicious/noExplicitAny: form types vary between add/edit schemas
type FormProps = {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors;
};

// --- Plus One Section ---

interface PlusOneSectionProps extends FormProps {
  showSection?: boolean;
}

export function PlusOneSection({
  register,
  watch,
  setValue,
  showSection = true,
}: PlusOneSectionProps) {
  const plusOneAllowed = watch("plusOneAllowed");
  const plusOneFirstName = watch("plusOneFirstName");

  if (!showSection) return null;

  return (
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
              disabled={!plusOneFirstName}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Contact Information Section ---

interface ContactSectionProps extends FormProps {
  showPhysicalInvite?: boolean;
}

export function ContactSection({
  register,
  watch,
  setValue,
  showPhysicalInvite = false,
}: ContactSectionProps) {
  return (
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
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred Contact Method</Label>
        <Select
          value={watch("preferredContactMethod") || "none"}
          onValueChange={(
            value: "none" | "email" | "text" | "whatsapp" | "phone_call",
          ) =>
            setValue("preferredContactMethod", value === "none" ? "" : value)
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
        <Label>Preferred Language</Label>
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

      {showPhysicalInvite && (
        <div className="flex items-center justify-between">
          <Label htmlFor="physicalInviteSent">Physical Invite Sent</Label>
          <Switch
            id="physicalInviteSent"
            checked={watch("physicalInviteSent")}
            onCheckedChange={(checked) =>
              setValue("physicalInviteSent", checked)
            }
          />
        </div>
      )}
    </div>
  );
}

// --- Admin Flags Section ---

export function AdminFlagsSection({ watch, setValue }: FormProps) {
  const family = watch("family");
  const under21 = watch("under21");
  const threeAndUnder = watch("threeAndUnder");

  return (
    <div className="border-t pt-4 mt-2 space-y-4">
      <h3 className="text-sm font-semibold">Admin Information</h3>

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
          onCheckedChange={(checked) => {
            setValue("under21", checked);
            if (!checked) setValue("threeAndUnder", false);
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="threeAndUnder">3 and Under</Label>
        <Switch
          id="threeAndUnder"
          checked={threeAndUnder}
          onCheckedChange={(checked) => {
            setValue("threeAndUnder", checked);
            if (checked) setValue("under21", true);
          }}
        />
      </div>
    </div>
  );
}

// --- Bridal Party Section ---

export function BridalPartySection({ watch, setValue, errors }: FormProps) {
  const gender = watch("gender");

  return (
    <div className="border-t pt-4 mt-2 space-y-4">
      <h3 className="text-sm font-semibold">Bridal Party</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select
            value={gender || "none"}
            onValueChange={(value: "none" | "male" | "female") => {
              setValue("gender", value === "none" ? "" : value);
              if (value === "none") setValue("bridalPartyRole", "");
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
            onValueChange={(value: string) =>
              setValue("bridalPartyRole", value === "none" ? "" : value)
            }
            disabled={!gender}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {gender === "male" && (
                <>
                  <SelectItem value="groomsman">Groomsman</SelectItem>
                  <SelectItem value="best_man">Best Man</SelectItem>
                </>
              )}
              {gender === "female" && (
                <>
                  <SelectItem value="bridesmaid">Bridesmaid</SelectItem>
                  <SelectItem value="maid_of_honor">Maid of Honor</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {errors.bridalPartyRole && (
            <p className="text-sm text-destructive">
              {errors.bridalPartyRole.message as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Event Invitations Section ---

interface EventInvitationsSectionProps {
  events: EventOption[];
  selectedEventIds: string[];
  onToggleEvent: (eventId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function EventInvitationsSection({
  events,
  selectedEventIds,
  onToggleEvent,
  onSelectAll,
  onDeselectAll,
}: EventInvitationsSectionProps) {
  if (events.length === 0) return null;

  const allSelected = selectedEventIds.length === events.length;

  return (
    <div className="border-t pt-4 mt-2 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Event Invitations</h3>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-center justify-between">
            <Label htmlFor={`event-${event.id}`}>{event.name}</Label>
            <Switch
              id={`event-${event.id}`}
              checked={selectedEventIds.includes(event.id)}
              onCheckedChange={() => onToggleEvent(event.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Party Select ---

interface PartySelectProps extends FormProps {
  parties: PartyOption[];
}

export function PartySelect({ watch, setValue, parties }: PartySelectProps) {
  return (
    <div className="space-y-2">
      <Label>Party</Label>
      <Select
        value={watch("partyId") || "none"}
        onValueChange={(value) =>
          setValue("partyId", value === "none" ? "" : value)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Create new party" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Create new party</SelectItem>
          {parties.map((party) => (
            <SelectItem key={party.id} value={party.id}>
              {party.inviteCode} -{" "}
              {party.name || party.guestNames || "Empty party"} (
              {party.guestCount} guests)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
