"use client";

import { Search, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { searchGuests, setInviteCodeCookie } from "./actions";

interface GuestResult {
  inviteCode: string;
  name: string;
}

export function GuestIdentifier() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuestResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLFieldSetElement>(null);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchGuests(value);
        setResults(matches);
        setShowDropdown(matches.length > 0);
      });
    }, 300);
  }

  async function handleSelect(guest: GuestResult) {
    setShowDropdown(false);
    setQuery(guest.name);
    await setInviteCodeCookie(guest.inviteCode);
    router.refresh();
  }

  return (
    <fieldset
      ref={containerRef}
      className="relative mx-auto max-w-md border-none p-0 m-0"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget)) {
          setShowDropdown(false);
        }
      }}
    >
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-lg">
        <p className="text-sm text-muted-foreground mb-3 text-center">
          Search your name to mark your interests
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Type your name..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-8 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setShowDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {results.map((guest) => (
            <button
              key={guest.inviteCode}
              type="button"
              onClick={() => handleSelect(guest)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/50 transition-colors text-left"
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{guest.name}</span>
            </button>
          ))}
        </div>
      )}

      {isPending && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-lg px-4 py-3 text-sm text-muted-foreground text-center">
          Searching...
        </div>
      )}
    </fieldset>
  );
}
