"use client";

import type { WeddingAdmin } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { inviteAdmin, removeAdmin } from "../actions";

export function AdminsSection({ admins }: { admins: WeddingAdmin[] }) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("owner");

  function handleInvite() {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    startTransition(async () => {
      const result = await inviteAdmin({ email, role });
      if (result.success) {
        toast.success("Admin invited successfully");
        setEmail("");
        setRole("owner");
      } else {
        toast.error(result.error ?? "Failed to invite admin");
      }
    });
  }

  function handleRemove(adminId: string) {
    startTransition(async () => {
      const result = await removeAdmin(adminId);
      if (result.success) {
        toast.success("Admin removed");
      } else {
        toast.error(result.error ?? "Failed to remove admin");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Manage who has admin access to your wedding dashboard.
      </p>

      {/* Current admins list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Current Admins</h3>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{admin.email}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        admin.role === "owner"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      }`}
                    >
                      {admin.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Added{" "}
                      {new Date(admin.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(admin.id)}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="space-y-4 rounded-md border border-border p-4">
        <h3 className="text-sm font-medium">Invite Admin</h3>
        <div>
          <Label htmlFor="adminEmail">Email</Label>
          <Input
            id="adminEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@example.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="adminRole">Role</Label>
          <select
            id="adminRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Owners can manage admins and all settings. Editors can manage
            content only.
          </p>
        </div>
        <Button onClick={handleInvite} disabled={isPending}>
          {isPending ? "Inviting..." : "Invite Admin"}
        </Button>
      </div>
    </div>
  );
}
