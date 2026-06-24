"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { verifyInviteCode } from "./actions";

interface CodeEntryProps {
  initialCode?: string;
  onSuccess: (code: string) => void;
}

export function CodeEntry({ initialCode = "", onSuccess }: CodeEntryProps) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("rsvpPage");

  async function handleVerify() {
    // Guard re-entry: the button is disabled while loading, but the Enter key
    // can still fire this, so bail if a verification is already in flight.
    if (loading) return;
    if (inviteCode.length < 8) {
      toast.error(t("invalidCode"), {
        description: t("enterValidCode"),
      });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyInviteCode(inviteCode);

      if (result.success && result.guests) {
        onSuccess(inviteCode);
      } else {
        toast.error(t("invalidCode"), {
          description: result.error || t("invalidCodeEntered"),
        });
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error(t("error"), {
        description: t("failedToVerify"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="invite-code" className="block text-sm font-medium mb-2">
          {t("enterInviteCode")}
        </label>
        <Input
          id="invite-code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder={t("placeholder")}
          className="text-center text-lg font-mono"
          maxLength={9}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleVerify();
            }
          }}
        />
        <p className="text-sm text-muted-foreground mt-2">{t("codeInEmail")}</p>
      </div>
      <Button
        onClick={handleVerify}
        disabled={loading || inviteCode.length < 8}
        className="w-full"
      >
        {loading ? t("verifying") : t("continue")}
      </Button>
    </div>
  );
}
