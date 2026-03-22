"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
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
import { ExternalLink } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type EditGiftFormData, editGiftSchema } from "@/lib/validations/gift";

interface Gift {
  id: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentLinkId: string | null;
  stripeChargeId: string | null;
  donorEmail: string | null;
  donorName: string | null;
  amountCents: number;
  currency: string;
  giftType: "baby_fund" | "honeymoon" | "student_loans" | null;
  guestId: string | null;
  status: "pending" | "completed" | "refunded" | "failed";
  thankYouEmailSent: boolean;
  thankYouEmailSentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
}

interface GuestOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

interface EditGiftSheetProps {
  gift: Gift;
  guestOptions: GuestOption[];
}

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const giftTypeLabels: Record<string, string> = {
  baby_fund: "Baby Fund",
  honeymoon: "Honeymoon",
  student_loans: "Student Loans",
};

const giftTypeColors: Record<string, string> = {
  baby_fund: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  honeymoon: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  student_loans:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refunded:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function EditGiftSheet({ gift, guestOptions }: EditGiftSheetProps) {
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialValues = useMemo(
    (): EditGiftFormData => ({
      guestId: gift.guestId,
      thankYouEmailSent: gift.thankYouEmailSent,
      notes: gift.notes || "",
    }),
    [gift],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EditGiftFormData>({
    resolver: zodResolver(editGiftSchema),
    defaultValues: initialValues,
  });

  const thankYouEmailSent = watch("thankYouEmailSent");
  const selectedGuestId = watch("guestId");

  const formValues = watch();

  const hasFormChanged = useMemo(() => {
    const fieldsToCompare: (keyof EditGiftFormData)[] = [
      "guestId",
      "thankYouEmailSent",
      "notes",
    ];

    return fieldsToCompare.some((field) => {
      const initial = initialValues[field] ?? "";
      const current = formValues[field] ?? "";
      return initial !== current;
    });
  }, [formValues, initialValues]);

  // Filter guest options based on search query
  const filteredGuestOptions = useMemo(() => {
    if (!guestSearchQuery) return guestOptions;
    const query = guestSearchQuery.toLowerCase();
    return guestOptions.filter((guest) => {
      const fullName =
        `${guest.firstName} ${guest.lastName || ""}`.toLowerCase();
      const email = guest.email?.toLowerCase() || "";
      return fullName.includes(query) || email.includes(query);
    });
  }, [guestOptions, guestSearchQuery]);

  function closeSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.push(`/admin/gifts?${params.toString()}`, { scroll: false });
  }

  async function onSubmit(data: EditGiftFormData) {
    try {
      const response = await fetch("/api/admin/gifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: gift.id,
          guestId: data.guestId,
          thankYouEmailSent: data.thankYouEmailSent,
          notes: data.notes || null,
        }),
      });

      if (response.ok) {
        toast.success("Gift updated!", {
          description: "Gift record has been updated successfully.",
        });
        closeSheet();
        router.refresh();
      } else {
        toast.error("Failed to update gift");
      }
    } catch (error) {
      console.error("Error updating gift:", error);
      toast.error("Failed to update gift");
    }
  }

  // Find the selected guest for display
  const selectedGuest = guestOptions.find((g) => g.id === selectedGuestId);

  return (
    <Sheet open onOpenChange={closeSheet}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-2xl font-serif">Edit Gift</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 min-h-0">
            {/* Gift Details (Read-only) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Gift Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(gift.amountCents, gift.currency)}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Fund Type</Label>
                  <div>
                    {gift.giftType ? (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${giftTypeColors[gift.giftType] || ""}`}
                      >
                        {giftTypeLabels[gift.giftType] || gift.giftType}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Unknown
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[gift.status] || ""}`}
                    >
                      {gift.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="text-sm">{formatDate(gift.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">Donor</Label>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {gift.donorName || "Anonymous"}
                  </span>
                  {gift.donorEmail && (
                    <span className="text-sm text-muted-foreground">
                      {gift.donorEmail}
                    </span>
                  )}
                </div>
              </div>

              {gift.stripePaymentIntentId && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Stripe</Label>
                  <div>
                    <a
                      href={`https://dashboard.stripe.com/payments/${gift.stripePaymentIntentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View in Stripe Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Fields */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Manage Gift
              </h3>

              {/* Guest Association */}
              <div className="space-y-2">
                <Label>Matched Guest</Label>
                <Select
                  value={selectedGuestId || "none"}
                  onValueChange={(value) =>
                    setValue("guestId", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a guest...">
                      {selectedGuestId && selectedGuest ? (
                        <span>
                          {selectedGuest.firstName}{" "}
                          {selectedGuest.lastName || ""}
                          {selectedGuest.email && (
                            <span className="text-muted-foreground ml-1">
                              ({selectedGuest.email})
                            </span>
                          )}
                        </span>
                      ) : (
                        "No guest matched"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search guests..."
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={guestSearchQuery}
                        onChange={(e) => setGuestSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">
                        No guest matched
                      </span>
                    </SelectItem>
                    {filteredGuestOptions.map((guest) => (
                      <SelectItem key={guest.id} value={guest.id}>
                        <div className="flex flex-col">
                          <span>
                            {guest.firstName} {guest.lastName || ""}
                          </span>
                          {guest.email && (
                            <span className="text-xs text-muted-foreground">
                              {guest.email}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {filteredGuestOptions.length === 0 && guestSearchQuery && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No guests found
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this gift to a guest from your guest list
                </p>
              </div>

              {/* Thank You Email Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="thankYouEmailSent">
                    Thank You Email Sent
                  </Label>
                  {gift.thankYouEmailSentAt && (
                    <p className="text-xs text-muted-foreground">
                      Sent on {formatDate(gift.thankYouEmailSentAt)}
                    </p>
                  )}
                </div>
                <Switch
                  id="thankYouEmailSent"
                  checked={thankYouEmailSent}
                  onCheckedChange={(checked) =>
                    setValue("thankYouEmailSent", checked)
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this gift..."
                  className="min-h-[100px] resize-none"
                  {...register("notes")}
                />
                <p className="text-xs text-muted-foreground">
                  Internal notes about this gift (not visible to donors)
                </p>
              </div>
            </div>

            {/* Current Match Info */}
            {gift.guestId &&
              gift.guestFirstName &&
              selectedGuestId !== gift.guestId && (
                <div className="border-t pt-4">
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> This gift was originally matched to{" "}
                      <span className="font-medium">
                        {gift.guestFirstName} {gift.guestLastName || ""}
                      </span>
                      . Changing the match will update the association.
                    </p>
                  </div>
                </div>
              )}
          </div>

          {/* Footer with buttons */}
          <div className="flex-shrink-0 space-y-4 pt-4 border-t bg-background">
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
                {isSubmitting ? "Updating..." : "Update Gift"}
              </Button>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
