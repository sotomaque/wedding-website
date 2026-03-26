"use client";

import Link from "next/link";
import { AdminUserButton } from "@/components/admin-user-button";

export function PlatformAdminNav() {
  return (
    <nav className="border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="font-serif text-lg">Platform Admin</h1>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Dashboard
        </Link>
        <AdminUserButton />
      </div>
    </nav>
  );
}
