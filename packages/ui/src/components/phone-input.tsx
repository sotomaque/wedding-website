"use client";

import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  international?: boolean;
}

function formatPhoneNumber(value: string, international: boolean): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");

  if (international) {
    // Support both US (+1) and Mexico (+52) formats
    if (digits.length === 0) return "";

    // Determine country code
    const isMexico = digits.startsWith("52");
    const isUS = digits.startsWith("1");

    if (isMexico) {
      // Mexico format: +52 XX XXXX XXXX (12 digits total)
      if (digits.length <= 2) return `+${digits}`;
      if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
      return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
    } else if (isUS) {
      // US format: +1 (XXX) XXX-XXXX (11 digits total)
      if (digits.length <= 1) return `+${digits}`;
      if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`;
      if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
      return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
    } else {
      // Generic international format: +XX XXXX XXXX
      if (digits.length <= 2) return `+${digits}`;
      if (digits.length <= 6) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `+${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
    }
  } else {
    // US format: (XXX) XXX-XXXX
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, international = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(
      value ? formatPhoneNumber(value, international) : ""
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatPhoneNumber(value, international));
      }
    }, [value, international]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const digits = input.replace(/\D/g, "");

      // Determine max digits based on country code
      let maxDigits = 10; // Default US domestic
      if (international) {
        if (digits.startsWith("52")) {
          maxDigits = 12; // Mexico: +52 XX XXXX XXXX
        } else if (digits.startsWith("1")) {
          maxDigits = 11; // US: +1 (XXX) XXX-XXXX
        } else {
          maxDigits = 15; // Generic international max
        }
      }

      const limitedDigits = digits.slice(0, maxDigits);

      const formatted = formatPhoneNumber(limitedDigits, international);
      setDisplayValue(formatted);

      if (onChange) {
        onChange(limitedDigits);
      }
    };

    return (
      <input
        ref={ref}
        type="tel"
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
