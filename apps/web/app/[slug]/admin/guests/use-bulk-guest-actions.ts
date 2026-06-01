"use client";

import type { Guest } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Custom hook for bulk guest actions (send email, calendar invites, RSVP updates).
 * Extracted from guests-table.tsx to reduce component complexity.
 */
export function useBulkGuestActions(
  selectedGuests: Guest[],
  clearSelection: () => void,
) {
  const router = useRouter();
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [isBulkSendingCalendar, setIsBulkSendingCalendar] = useState(false);
  const [isBulkSettingRsvp, setIsBulkSettingRsvp] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Validation
  const allHaveEmail = selectedGuests.every((g) => g.email?.includes("@"));
  const noneHaveRsvpdYes = selectedGuests.every((g) => g.rsvpStatus !== "yes");
  const canBulkSendEmail =
    selectedGuests.length > 0 && allHaveEmail && noneHaveRsvpdYes;

  const allAttendingWithEmail = selectedGuests.every(
    (g) => g.rsvpStatus === "yes" && g.email?.includes("@"),
  );
  const canBulkSendCalendarInvites =
    selectedGuests.length > 0 && allAttendingWithEmail;

  function getEmailValidationMessage(): string | null {
    if (selectedGuests.length === 0) return null;
    if (!allHaveEmail) {
      const withoutEmail = selectedGuests.filter(
        (g) => !g.email?.includes("@"),
      );
      return `${withoutEmail.length} selected guest(s) don't have valid emails`;
    }
    if (!noneHaveRsvpdYes) {
      const alreadyRsvpd = selectedGuests.filter((g) => g.rsvpStatus === "yes");
      return `${alreadyRsvpd.length} selected guest(s) have already RSVP'd yes`;
    }
    return null;
  }

  function getCalendarValidationMessage(): string | null {
    if (selectedGuests.length === 0) return null;
    const ineligible = selectedGuests.filter(
      (g) => g.rsvpStatus !== "yes" || !g.email?.includes("@"),
    );
    if (ineligible.length > 0) {
      return `${ineligible.length} selected guest(s) are not attending or have no email`;
    }
    return null;
  }

  async function handleBulkSendEmail() {
    if (!canBulkSendEmail) return;

    setIsBulkSending(true);
    try {
      const response = await fetch("/api/admin/guests/bulk-send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestIds: selectedGuests.map((g) => g.id),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Emails sent!", {
          description: `Successfully sent invitations to ${data.sentCount} guest(s)`,
        });
        clearSelection();
        router.refresh();
      } else {
        toast.error("Error", {
          description: data.error || "Failed to send emails",
        });
      }
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast.error("Error", { description: "Failed to send emails" });
    } finally {
      setIsBulkSending(false);
    }
  }

  async function handleBulkSendCalendarInvites() {
    if (!canBulkSendCalendarInvites) return;

    setIsBulkSendingCalendar(true);
    try {
      const response = await fetch(
        "/api/admin/guests/bulk-send-calendar-invites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestIds: selectedGuests.map((g) => g.id),
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Calendar invites sent!", {
          description: `Successfully sent calendar invites to ${data.sentCount} guest(s)`,
        });
        clearSelection();
        router.refresh();
      } else {
        toast.error("Error", {
          description: data.error || "Failed to send calendar invites",
        });
      }
    } catch (error) {
      console.error("Error sending bulk calendar invites:", error);
      toast.error("Error", { description: "Failed to send calendar invites" });
    } finally {
      setIsBulkSendingCalendar(false);
    }
  }

  async function handleBulkSetRsvp(status: "yes" | "no" | "pending") {
    if (selectedGuests.length === 0) return;

    setIsBulkSettingRsvp(true);
    try {
      const response = await fetch("/api/admin/guests/bulk-set-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestIds: selectedGuests.map((g) => g.id),
          rsvpStatus: status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const label =
          status === "yes"
            ? "attending"
            : status === "no"
              ? "declined"
              : "pending";
        toast.success("RSVP updated!", {
          description: `Marked ${data.updatedCount} guest(s) as ${label}`,
        });
        clearSelection();
        router.refresh();
      } else {
        toast.error("Error", {
          description: data.error || "Failed to update RSVP status",
        });
      }
    } catch (error) {
      console.error("Error updating bulk RSVP:", error);
      toast.error("Error", { description: "Failed to update RSVP status" });
    } finally {
      setIsBulkSettingRsvp(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedGuests.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch("/api/admin/guests/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: selectedGuests.map((g) => g.id) }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Guests deleted", {
          description: `Removed ${data.deletedCount} guest(s)`,
        });
        clearSelection();
        router.refresh();
      } else {
        toast.error("Error", {
          description: data.error || "Failed to delete guests",
        });
      }
    } catch (error) {
      console.error("Error deleting bulk guests:", error);
      toast.error("Error", { description: "Failed to delete guests" });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return {
    isBulkSending,
    isBulkSendingCalendar,
    isBulkSettingRsvp,
    isBulkDeleting,
    canBulkSendEmail,
    canBulkSendCalendarInvites,
    getEmailValidationMessage,
    getCalendarValidationMessage,
    handleBulkSendEmail,
    handleBulkSendCalendarInvites,
    handleBulkSetRsvp,
    handleBulkDelete,
  };
}
