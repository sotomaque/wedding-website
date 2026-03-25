"use client";

import { cn } from "@workspace/ui/lib/utils";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/env";

const API_KEY = env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

interface GeoapifyFeature {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    state_code?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface AddressResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className,
  id,
  disabled,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoapifyFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (query: string) => {
    if (!API_KEY || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams({
        text: query,
        apiKey: API_KEY,
        limit: "5",
        type: "amenity",
        format: "geojson",
      });
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
        { signal: controller.signal },
      );
      if (!res.ok) return;

      const data = await res.json();
      const features: GeoapifyFeature[] = data.features ?? [];
      setSuggestions(features);
      setIsOpen(features.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSuggestions([]);
      setIsOpen(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(val), 300);
    },
    [onChange, search],
  );

  const handleSelect = useCallback(
    (feature: GeoapifyFeature) => {
      const { properties: p } = feature;
      const formatted = p.formatted;
      onChange(formatted);
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);

      onSelect?.({
        formattedAddress: formatted,
        latitude: p.lat,
        longitude: p.lon,
        street:
          [p.housenumber, p.street].filter(Boolean).join(" ") || undefined,
        city: p.city,
        state: p.state,
        stateCode: p.state_code,
        postalCode: p.postcode,
        country: p.country,
        countryCode: p.country_code,
      });
    },
    [onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        if (selected) handleSelect(selected);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    },
    [isOpen, suggestions, activeIndex, handleSelect],
  );

  const showFallback = !API_KEY;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-activedescendant={
          activeIndex >= 0 && id ? `${id}-option-${activeIndex}` : undefined
        }
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
      />

      {isOpen && suggestions.length > 0 && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md overflow-hidden"
        >
          {suggestions.map((feature, index) => (
            <div
              key={`${feature.properties.lat}-${feature.properties.lon}-${index}`}
              id={id ? `${id}-option-${index}` : undefined}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(feature);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex items-start gap-2 px-3 py-2 text-sm cursor-pointer",
                index === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{feature.properties.formatted}</span>
            </div>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-right border-t">
            Powered by Geoapify
          </div>
        </div>
      )}

      {showFallback && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Set NEXT_PUBLIC_GEOAPIFY_API_KEY for address suggestions
        </p>
      )}
    </div>
  );
}
