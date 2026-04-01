"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type AddGuestFormData, addGuestSchema } from "@/lib/validations/guest";
import type { EventOption, PartyOption } from "./actions";
import {
  AdminFlagsSection,
  BridalPartySection,
  ContactSection,
  EventInvitationsSection,
  PartySelect,
  PlusOneSection,
} from "./guest-form-sections";

interface AddGuestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parties: PartyOption[];
  events: EventOption[];
}

export function AddGuestForm({
  open,
  onClose,
  onSuccess,
  parties,
  events,
}: AddGuestFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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
      preferredLanguage: "",
      family: false,
      under21: false,
      threeAndUnder: false,
      notes: "",
      gender: "",
      bridalPartyRole: "",
      partyId: "",
      eventIds: events.filter((e) => e.isDefault).map((e) => e.id),
    },
  });

  const email = watch("email");
  const eventIds = watch("eventIds") ?? [];
  const allEventsSelected =
    events.length > 0 && eventIds.length === events.length;
  const someEventsSelected =
    eventIds.length > 0 && eventIds.length < events.length;
  const noEventsSelected = eventIds.length === 0;

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
        reset();
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

            {/* Party Assignment */}
            <PartySelect
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              parties={parties}
            />

            {/* Plus One */}
            <PlusOneSection
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />

            {/* Contact Information */}
            <ContactSection
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />

            {/* Admin Flags */}
            <AdminFlagsSection
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Internal notes about this guest..."
                rows={3}
              />
            </div>

            {/* Bridal Party */}
            <BridalPartySection
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />

            {/* Event Invitations */}
            <EventInvitationsSection
              events={events}
              selectedEventIds={eventIds}
              onToggleEvent={(eventId) => {
                const current = eventIds;
                if (current.includes(eventId)) {
                  setValue(
                    "eventIds",
                    current.filter((id) => id !== eventId),
                  );
                } else {
                  setValue("eventIds", [...current, eventId]);
                }
              }}
              onSelectAll={() =>
                setValue(
                  "eventIds",
                  events.map((e) => e.id),
                )
              }
              onDeselectAll={() => setValue("eventIds", [])}
            />
            {events.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {allEventsSelected &&
                  "Single wedding invitation email will be sent"}
                {someEventsSelected &&
                  "Individual event invitation emails will be sent"}
                {noEventsSelected && "No invitation emails will be sent"}
              </p>
            )}

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
                  disabled={!email || email.trim() === "" || noEventsSelected}
                />
              </div>
              {(!email || email.trim() === "") && (
                <p className="text-xs text-muted-foreground mt-1">
                  Email address required to send invitation
                </p>
              )}
              {email && email.trim() !== "" && noEventsSelected && (
                <p className="text-xs text-muted-foreground mt-1">
                  Select at least one event to send invitation
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
