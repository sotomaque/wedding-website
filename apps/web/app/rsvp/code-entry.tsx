"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { useState } from "react";
import { verifyInviteCode } from "./actions";

interface CodeEntryProps {
  initialCode?: string;
  onSuccess: (code: string) => void;
}

export function CodeEntry({ initialCode = "", onSuccess }: CodeEntryProps) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleVerify() {
    if (inviteCode.length < 8) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a valid invite code",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyInviteCode(inviteCode);

      if (result.success && result.guests) {
        onSuccess(inviteCode);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description:
            result.error || "The invite code you entered is not valid.",
        });
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify invite code",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="invite-code" className="block text-sm font-medium mb-2">
          Enter your invite code
        </label>
        <Input
          id="invite-code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          className="text-center text-lg font-mono"
          maxLength={9}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleVerify();
            }
          }}
        />
        <p className="text-sm text-muted-foreground mt-2">
          Your invite code was included in your invitation email
        </p>
      </div>
      <Button
        onClick={handleVerify}
        disabled={loading || inviteCode.length < 8}
        className="w-full"
      >
        {loading ? "Verifying..." : "Continue"}
      </Button>
    </div>
  );
}
