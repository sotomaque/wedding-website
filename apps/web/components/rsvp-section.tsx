"use client";

import { Button } from "@workspace/ui/components/button";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { RSVP_CONTENT } from "../app/constants";

interface RSVPFormData {
  firstName: string;
  lastName: string;
  email: string;
  attending: string;
  plusOne: boolean;
  travel: string;
  needsAccommodation: boolean;
  dietary: string;
}

export function RSVPSection() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RSVPFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      attending: RSVP_CONTENT.form.attending.options[0],
      plusOne: false,
      travel: "",
      needsAccommodation: false,
      dietary: "",
    },
  });

  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const attendingValue = watch("attending");
  const isAttending = attendingValue === "Joyfully accepts";

  const onSubmit = async (data: RSVPFormData) => {
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit RSVP");
      }

      setSubmitStatus({
        type: "success",
        message: "Thank you! Your RSVP has been submitted successfully.",
      });

      // Reset form
      reset();
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <section id="rsvp" className="py-24 px-6 bg-secondary scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-6 text-foreground">
          {RSVP_CONTENT.title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-6" />
        <p className="text-muted-foreground text-center mb-12">
          {RSVP_CONTENT.deadline}
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative aspect-[4/5] rounded-lg overflow-hidden order-2 md:order-1">
            <Image
              src={RSVP_CONTENT.image.src}
              alt={RSVP_CONTENT.image.alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border order-1 md:order-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-left">
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {RSVP_CONTENT.form.firstName.label}
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    {...register("firstName", {
                      required: "First name is required",
                      minLength: {
                        value: 2,
                        message: "First name must be at least 2 characters",
                      },
                    })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                    placeholder={RSVP_CONTENT.form.firstName.placeholder}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="text-left">
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {RSVP_CONTENT.form.lastName.label}
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    {...register("lastName", {
                      required: "Last name is required",
                      minLength: {
                        value: 2,
                        message: "Last name must be at least 2 characters",
                      },
                    })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                    placeholder={RSVP_CONTENT.form.lastName.placeholder}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-left">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {RSVP_CONTENT.form.email.label}
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                  placeholder={RSVP_CONTENT.form.email.placeholder}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="text-left">
                <label
                  htmlFor="attending"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {RSVP_CONTENT.form.attending.label}
                </label>
                <select
                  id="attending"
                  {...register("attending", {
                    required: "Please select your attendance status",
                  })}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                >
                  {RSVP_CONTENT.form.attending.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.attending && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.attending.message}
                  </p>
                )}
              </div>
              <div className="text-left">
                <label
                  className={`flex items-center gap-2 ${isAttending ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <input
                    id="plusOne"
                    type="checkbox"
                    disabled={!isAttending}
                    {...register("plusOne")}
                    className="w-4 h-4 rounded border-input text-ring focus:ring-2 focus:ring-ring cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {RSVP_CONTENT.form.plusOne.label}
                  </span>
                </label>
              </div>
              <div className="text-left">
                <label
                  htmlFor="travel"
                  className={`block text-sm font-medium text-foreground mb-2 ${!isAttending && "opacity-50"}`}
                >
                  {RSVP_CONTENT.form.travel.label}
                </label>
                <input
                  id="travel"
                  type="text"
                  disabled={!isAttending}
                  {...register("travel")}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={RSVP_CONTENT.form.travel.placeholder}
                />
              </div>
              <div className="text-left">
                <label
                  className={`flex items-center gap-2 ${isAttending ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <input
                    id="needsAccommodation"
                    type="checkbox"
                    disabled={!isAttending}
                    {...register("needsAccommodation")}
                    className="w-4 h-4 rounded border-input text-ring focus:ring-2 focus:ring-ring cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {RSVP_CONTENT.form.needsAccommodation.label}
                  </span>
                </label>
              </div>
              <div className="text-left">
                <label
                  htmlFor="dietary"
                  className={`block text-sm font-medium text-foreground mb-2 ${!isAttending && "opacity-50"}`}
                >
                  {RSVP_CONTENT.form.dietary.label}
                </label>
                <textarea
                  id="dietary"
                  rows={RSVP_CONTENT.form.dietary.rows}
                  disabled={!isAttending}
                  {...register("dietary")}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={RSVP_CONTENT.form.dietary.placeholder}
                />
              </div>

              {submitStatus.type && (
                <div
                  className={`p-4 rounded-md ${
                    submitStatus.type === "success"
                      ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {submitStatus.message}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full font-semibold"
              >
                {isSubmitting
                  ? "Submitting..."
                  : RSVP_CONTENT.form.submitButton}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
