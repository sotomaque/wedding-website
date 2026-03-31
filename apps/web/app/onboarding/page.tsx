"use client";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { OnboardingPhotoUpload } from "@/components/onboarding-photo-upload";
import { OnboardingPreview } from "@/components/onboarding-preview";
import { OnboardingThemePicker } from "@/components/onboarding-theme-picker";
import { TIMEZONES } from "@/lib/constants/timezones";
import { createWedding, uploadOnboardingPhotos, validateSlug } from "./actions";

const TOTAL_STEPS = 6;

interface FormData {
  person1Name: string;
  person2Name: string;
  slug: string;
  weddingDate: string;
  timezone: string;
  themeId: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  receptionVenue: string;
  receptionAddress: string;
}

function generateSlug(person1: string, person2: string): string {
  if (!person1 && !person2) return "";
  const parts = [person1, person2].filter(Boolean);
  return parts
    .join("-and-")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    person1Name: "",
    person2Name: "",
    slug: "",
    weddingDate: "",
    timezone: "America/New_York",
    themeId: "warm-gold",
    ceremonyVenue: "",
    ceremonyAddress: "",
    receptionVenue: "",
    receptionAddress: "",
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [slugStatus, setSlugStatus] = useState<{
    valid: boolean;
    error?: string;
    checking: boolean;
  }>({ valid: false, checking: false });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-suggest slug from names when slug hasn't been manually edited
  useEffect(() => {
    if (step === 2 && !slugTouched) {
      const suggested = generateSlug(
        formData.person1Name,
        formData.person2Name,
      );
      if (suggested) {
        setFormData((prev) => ({ ...prev, slug: suggested }));
      }
    }
  }, [step, formData.person1Name, formData.person2Name, slugTouched]);

  // Debounced slug validation
  useEffect(() => {
    if (!formData.slug) {
      setSlugStatus({ valid: false, checking: false });
      return;
    }

    setSlugStatus({ valid: false, checking: true });

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const result = await validateSlug(formData.slug);
      setSlugStatus({
        valid: result.valid,
        error: result.error,
        checking: false,
      });
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [formData.slug]);

  // Build blob URLs for preview
  const photoUrls = useMemo(
    () => photoFiles.map((f) => URL.createObjectURL(f)),
    [photoFiles],
  );

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      for (const url of photoUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoUrls]);

  const coupleName = [formData.person1Name, formData.person2Name]
    .filter(Boolean)
    .join(" & ");

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return (
          formData.person1Name.trim() !== "" &&
          formData.person2Name.trim() !== ""
        );
      case 2:
        return slugStatus.valid && !slugStatus.checking;
      case 3:
        return formData.weddingDate !== "";
      case 4:
        return formData.themeId !== "";
      case 5:
        return true; // Photos are optional
      case 6:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  const handleSubmit = useCallback(() => {
    setSubmitError("");
    startTransition(async () => {
      const result = await createWedding({
        person1Name: formData.person1Name.trim(),
        person2Name: formData.person2Name.trim(),
        slug: formData.slug,
        weddingDate: formData.weddingDate,
        timezone: formData.timezone,
        themeId: formData.themeId,
        ceremonyVenue: formData.ceremonyVenue.trim() || undefined,
        ceremonyAddress: formData.ceremonyAddress.trim() || undefined,
        receptionVenue: formData.receptionVenue.trim() || undefined,
        receptionAddress: formData.receptionAddress.trim() || undefined,
      });

      if (!result.success) {
        setSubmitError(result.error || "Something went wrong");
        return;
      }

      // Upload photos if any
      if (photoFiles.length > 0 && result.weddingId) {
        const fd = new FormData();
        for (const file of photoFiles) {
          fd.append("photos", file);
        }
        await uploadOnboardingPhotos(result.weddingId, fd);
      }

      router.push(`/${result.slug}/admin`);
    });
  }, [formData, photoFiles, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif">Create Your Wedding</h1>
          <p className="text-muted-foreground mt-1">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10 max-w-lg mx-auto lg:max-w-none">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* Split-screen layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Form */}
          <div className="max-w-lg mx-auto lg:max-w-none w-full">
            {/* Step 1: Couple Names */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif mb-1">
                    Who is getting married?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter the names of the happy couple.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="person1Name"
                      className="block text-sm font-medium mb-1.5"
                    >
                      Partner 1
                    </label>
                    <Input
                      id="person1Name"
                      placeholder="First name"
                      value={formData.person1Name}
                      onChange={(e) =>
                        updateField("person1Name", e.target.value)
                      }
                      autoFocus
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="person2Name"
                      className="block text-sm font-medium mb-1.5"
                    >
                      Partner 2
                    </label>
                    <Input
                      id="person2Name"
                      placeholder="First name"
                      value={formData.person2Name}
                      onChange={(e) =>
                        updateField("person2Name", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Choose Slug */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif mb-1">
                    Choose your wedding URL
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    This is the link you will share with your guests.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="slug"
                    className="block text-sm font-medium mb-1.5"
                  >
                    URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">
                      yoursite.com/
                    </span>
                    <Input
                      id="slug"
                      placeholder="your-wedding-url"
                      value={formData.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        updateField("slug", e.target.value.toLowerCase());
                      }}
                    />
                  </div>
                  <div className="mt-2 h-5">
                    {formData.slug && slugStatus.checking && (
                      <p className="text-sm text-muted-foreground">
                        Checking...
                      </p>
                    )}
                    {formData.slug &&
                      !slugStatus.checking &&
                      slugStatus.valid && (
                        <p className="text-sm text-green-600">
                          This URL is available
                        </p>
                      )}
                    {formData.slug &&
                      !slugStatus.checking &&
                      slugStatus.error && (
                        <p className="text-sm text-destructive">
                          {slugStatus.error}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Date & Venue */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif mb-1">Date & Venue</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    When and where is the celebration? Venue details are
                    optional.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Calendar popover trigger acts as the control */}
                    <label className="block text-sm font-medium mb-1.5">
                      Wedding Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.weddingDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.weddingDate
                            ? format(
                                new Date(`${formData.weddingDate}T00:00:00`),
                                "MMMM d, yyyy",
                              )
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            formData.weddingDate
                              ? new Date(`${formData.weddingDate}T00:00:00`)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(
                                2,
                                "0",
                              );
                              const dd = String(date.getDate()).padStart(
                                2,
                                "0",
                              );
                              updateField("weddingDate", `${yyyy}-${mm}-${dd}`);
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          defaultMonth={
                            formData.weddingDate
                              ? new Date(`${formData.weddingDate}T00:00:00`)
                              : undefined
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Select handles focus internally */}
                    <label className="block text-sm font-medium mb-1.5">
                      Timezone
                    </label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => updateField("timezone", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3">
                      Ceremony{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </p>
                    <div className="space-y-3">
                      <Input
                        placeholder="Venue name"
                        value={formData.ceremonyVenue}
                        onChange={(e) =>
                          updateField("ceremonyVenue", e.target.value)
                        }
                      />
                      <AddressAutocomplete
                        placeholder="Address"
                        value={formData.ceremonyAddress}
                        onChange={(val) => updateField("ceremonyAddress", val)}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3">
                      Reception{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </p>
                    <div className="space-y-3">
                      <Input
                        placeholder="Venue name"
                        value={formData.receptionVenue}
                        onChange={(e) =>
                          updateField("receptionVenue", e.target.value)
                        }
                      />
                      <AddressAutocomplete
                        placeholder="Address"
                        value={formData.receptionAddress}
                        onChange={(val) => updateField("receptionAddress", val)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Theme */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif mb-1">Choose your theme</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Pick a color palette for your wedding site. You can change
                    this later.
                  </p>
                </div>
                <OnboardingThemePicker
                  selectedThemeId={formData.themeId}
                  onSelect={(id) => updateField("themeId", id)}
                />
              </div>
            )}

            {/* Step 5: Photos */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif mb-1">Add hero photos</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload photos for your wedding site hero section. You can
                    skip this and add photos later.
                  </p>
                </div>
                <OnboardingPhotoUpload
                  files={photoFiles}
                  onChange={setPhotoFiles}
                />
              </div>
            )}

            {/* Step 6: Review & Create */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif mb-1">Review & Create</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Make sure everything looks good before creating your
                    wedding.
                  </p>
                </div>
                <div className="space-y-4 rounded-lg border border-border p-5">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Couple
                    </p>
                    <p className="font-medium">{coupleName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      URL
                    </p>
                    <p className="font-medium">/{formData.slug}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Date
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(`${formData.weddingDate}T00:00:00`),
                        "MMMM d, yyyy",
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Timezone
                    </p>
                    <p className="font-medium">
                      {TIMEZONES.find((tz) => tz.value === formData.timezone)
                        ?.label || formData.timezone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Theme
                    </p>
                    <p className="font-medium capitalize">
                      {formData.themeId.replace(/-/g, " ")}
                    </p>
                  </div>
                  {photoFiles.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Photos
                      </p>
                      <p className="font-medium">
                        {photoFiles.length} photo
                        {photoFiles.length !== 1 ? "s" : ""} ready to upload
                      </p>
                    </div>
                  )}
                  {formData.ceremonyVenue && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Ceremony
                      </p>
                      <p className="font-medium">{formData.ceremonyVenue}</p>
                      {formData.ceremonyAddress && (
                        <p className="text-sm text-muted-foreground">
                          {formData.ceremonyAddress}
                        </p>
                      )}
                    </div>
                  )}
                  {formData.receptionVenue && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Reception
                      </p>
                      <p className="font-medium">{formData.receptionVenue}</p>
                      {formData.receptionAddress && (
                        <p className="text-sm text-muted-foreground">
                          {formData.receptionAddress}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10">
              {step > 1 ? (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isPending}
                >
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < TOTAL_STEPS ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  {step === 5 && photoFiles.length === 0 ? "Skip" : "Next"}
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Wedding"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Right: Live Preview (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <OnboardingPreview
                coupleName={coupleName}
                weddingDate={formData.weddingDate || undefined}
                themeId={formData.themeId}
                photoUrls={photoUrls}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
