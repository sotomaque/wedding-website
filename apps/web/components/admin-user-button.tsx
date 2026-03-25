"use client";

import { UserButton } from "@clerk/nextjs";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const themeOrder = ["light", "dark", "system"] as const;
const themeConfig = {
  light: { icon: <Sun className="size-4" />, label: "Theme: Light" },
  dark: { icon: <Moon className="size-4" />, label: "Theme: Dark" },
  system: { icon: <Monitor className="size-4" />, label: "Theme: System" },
};

export function AdminUserButton() {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? "system") as (typeof themeOrder)[number];
  const nextIndex = (themeOrder.indexOf(current) + 1) % themeOrder.length;
  const nextTheme = themeOrder[nextIndex] ?? "system";

  return (
    <UserButton
      appearance={{
        elements: {
          userButtonPopoverFooter: { display: "none" },
        },
      }}
      afterSignOutUrl="/"
    >
      <UserButton.MenuItems>
        <UserButton.Action
          label={themeConfig[current].label}
          labelIcon={themeConfig[current].icon}
          onClick={() => setTheme(nextTheme)}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
