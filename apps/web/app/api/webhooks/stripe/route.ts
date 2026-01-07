import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/env";
import { db } from "@/lib/db";
import { GIFT_NOTIFICATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Log prefix for easy filtering
const LOG_PREFIX = "[Stripe Webhook]";

/**
 * Structured logger for webhook events
 */
function log(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  data?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...data,
  };

  switch (level) {
    case "error":
      console.error(LOG_PREFIX, JSON.stringify(logData, null, 2));
      break;
    case "warn":
      console.warn(LOG_PREFIX, JSON.stringify(logData, null, 2));
      break;
    case "debug":
      console.log(LOG_PREFIX, "[DEBUG]", JSON.stringify(logData, null, 2));
      break;
    default:
      console.log(LOG_PREFIX, JSON.stringify(logData, null, 2));
  }
}

/**
 * Find a guest by email, name, or phone number
 * Returns the first matching guest or null if no match found
 */
async function findGuest(params: {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}) {
  const { email, name, phone } = params;

  log("debug", "Looking up guest by multiple criteria", {
    email,
    name,
    phone,
  });

  // Try to match by email first (most reliable)
  if (email) {
    const guestByEmail = await db
      .selectFrom("guests")
      .selectAll()
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();

    if (guestByEmail) {
      log("info", "Found matching guest by email", {
        guestId: guestByEmail.id,
        guestName: `${guestByEmail.first_name} ${guestByEmail.last_name}`,
        guestEmail: guestByEmail.email,
        matchedBy: "email",
      });
      return guestByEmail;
    }
  }

  // Try to match by name (first + last)
  if (name) {
    // Parse the name into first and last
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length >= 2 && nameParts[0]) {
      const firstName = nameParts[0].toLowerCase();
      const lastName = nameParts.slice(1).join(" ").toLowerCase();

      log("debug", "Attempting name match", { firstName, lastName });

      // Use raw SQL for case-insensitive matching
      const guestByName = await db
        .selectFrom("guests")
        .selectAll()
        .where((eb) =>
          eb.and([
            eb("first_name", "ilike", firstName),
            eb("last_name", "ilike", lastName),
          ]),
        )
        .executeTakeFirst();

      if (guestByName) {
        log("info", "Found matching guest by name", {
          guestId: guestByName.id,
          guestName: `${guestByName.first_name} ${guestByName.last_name}`,
          searchedName: name,
          matchedBy: "name",
        });
        return guestByName;
      }

      // Also try reverse order (last name first)
      const guestByNameReverse = await db
        .selectFrom("guests")
        .selectAll()
        .where((eb) =>
          eb.and([
            eb("first_name", "ilike", lastName),
            eb("last_name", "ilike", firstName),
          ]),
        )
        .executeTakeFirst();

      if (guestByNameReverse) {
        log("info", "Found matching guest by name (reversed)", {
          guestId: guestByNameReverse.id,
          guestName: `${guestByNameReverse.first_name} ${guestByNameReverse.last_name}`,
          searchedName: name,
          matchedBy: "name_reversed",
        });
        return guestByNameReverse;
      }
    }
  }

  // Try to match by phone number
  if (phone) {
    // Normalize phone number - remove all non-digit characters
    const normalizedPhone = phone.replace(/\D/g, "");

    log("debug", "Attempting phone match", {
      originalPhone: phone,
      normalizedPhone,
    });

    // Try phone_number field
    const guestByPhone = await db
      .selectFrom("guests")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("phone_number", "like", `%${normalizedPhone}`),
          eb("whatsapp", "like", `%${normalizedPhone}`),
        ]),
      )
      .executeTakeFirst();

    if (guestByPhone) {
      log("info", "Found matching guest by phone", {
        guestId: guestByPhone.id,
        guestName: `${guestByPhone.first_name} ${guestByPhone.last_name}`,
        searchedPhone: phone,
        matchedBy: "phone",
      });
      return guestByPhone;
    }
  }

  log("debug", "No matching guest found", {
    email,
    name,
    phone,
  });
  return null;
}

/**
 * Send gift notification email to admin
 */
async function sendGiftNotificationEmail(params: {
  donorName: string | null;
  donorEmail: string | null;
  amount: number; // in cents
  currency: string;
  giftType: "baby_fund" | "honeymoon" | "student_loans" | null;
  matchedGuest: { firstName: string; lastName: string | null } | null;
  chargeId: string;
}) {
  if (!getResendClient() || !env.RSVP_EMAIL) {
    log(
      "debug",
      "Skipping gift notification email - no Resend client or RSVP_EMAIL",
      {
        hasResendClient: !!getResendClient(),
        hasRsvpEmail: !!env.RSVP_EMAIL,
      },
    );
    return;
  }

  const {
    donorName,
    donorEmail,
    amount,
    currency,
    giftType,
    matchedGuest,
    chargeId,
  } = params;

  const amountDollars = amount / 100;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountDollars);

  const giftTypeLabel = giftType
    ? giftType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "General Gift";

  const giftEmoji =
    giftType === "baby_fund"
      ? "👶"
      : giftType === "honeymoon"
        ? "🏝️"
        : giftType === "student_loans"
          ? "🎓"
          : "🎁";

  try {
    const recipients = env.RSVP_EMAIL.split(",").map((e) => e.trim());
    await sendEmail({
      from: "Wedding Registry <rsvp@helen-and-enrique.com>",
      to: recipients,
      subject: `${giftEmoji} New Gift: ${formattedAmount} for ${giftTypeLabel}${donorName ? ` from ${donorName}` : ""}`,
      template: {
        id: GIFT_NOTIFICATION_TEMPLATE_ALIAS,
        variables: {
          DONOR_NAME: donorName || "Anonymous",
          DONOR_EMAIL: donorEmail || "No email provided",
          AMOUNT: formattedAmount,
          GIFT_TYPE: giftTypeLabel,
          GIFT_EMOJI: giftEmoji,
          MATCHED_GUEST_NAME: matchedGuest
            ? `${matchedGuest.firstName}${matchedGuest.lastName ? ` ${matchedGuest.lastName}` : ""}`
            : "",
          MATCHED_GUEST_STATUS: matchedGuest ? "matched" : "unmatched",
          MATCHED_GUEST_DISPLAY: matchedGuest ? "block" : "none",
          UNMATCHED_GUEST_DISPLAY: matchedGuest ? "none" : "block",
          CHARGE_ID: chargeId,
          SUBMITTED_AT: new Date().toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "America/Los_Angeles",
          }),
        },
      },
    });

    log("info", "Gift notification email sent", {
      chargeId,
      recipients: recipients.length,
      donorName,
      amountDollars,
      giftType,
    });
  } catch (emailError) {
    log("error", "Failed to send gift notification email", {
      chargeId,
      error:
        emailError instanceof Error ? emailError.message : String(emailError),
    });
  }
}

/**
 * Determine gift type from Stripe product ID
 * Product IDs are set via env vars and mapped to gift types
 */
function getGiftTypeFromProductId(
  productId: string | null | undefined,
): "baby_fund" | "honeymoon" | "student_loans" | null {
  if (!productId) return null;

  // Get product IDs from env vars
  const babyFundProductId = env.STRIPE_PRODUCT_BABY_FUND;
  const honeymoonProductId = env.STRIPE_PRODUCT_HONEYMOON;
  const studentLoansProductId = env.STRIPE_PRODUCT_STUDENT_LOANS;

  log("debug", "Matching product ID to gift type", {
    productId,
    babyFundProductId: babyFundProductId || "NOT SET",
    honeymoonProductId: honeymoonProductId || "NOT SET",
    studentLoansProductId: studentLoansProductId || "NOT SET",
  });

  if (babyFundProductId && productId === babyFundProductId) {
    return "baby_fund";
  }
  if (honeymoonProductId && productId === honeymoonProductId) {
    return "honeymoon";
  }
  if (studentLoansProductId && productId === studentLoansProductId) {
    return "student_loans";
  }

  return null;
}

/**
 * Handle charge.succeeded event
 * This provides the most reliable charge details including billing info
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
  log("info", "=== CHARGE SUCCEEDED ===", {
    chargeId: charge.id,
    amount: charge.amount,
    amountDollars: charge.amount / 100,
    currency: charge.currency,
    status: charge.status,
    paid: charge.paid,
  });

  // Log full charge details
  log("debug", "Full charge details", {
    chargeId: charge.id,
    paymentIntent: charge.payment_intent,
    paymentMethod: charge.payment_method,
    billingDetails: charge.billing_details,
    customer: charge.customer,
    description: charge.description,
    chargeMetadata: charge.metadata,
    receiptEmail: charge.receipt_email,
    receiptUrl: charge.receipt_url,
  });

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id || null;

  // Determine gift type from the PaymentIntent's product reference
  let giftType: "baby_fund" | "honeymoon" | "student_loans" | null = null;

  if (paymentIntentId) {
    try {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      // The product ID is in payment_details.order_reference
      const productId = (
        paymentIntent as unknown as {
          payment_details?: { order_reference?: string };
        }
      ).payment_details?.order_reference;

      log("debug", "Retrieved PaymentIntent for gift type", {
        paymentIntentId,
        productId,
      });

      giftType = getGiftTypeFromProductId(productId);

      if (giftType) {
        log("info", "Gift type determined from product ID", {
          giftType,
          productId,
          paymentIntentId,
        });
      }
    } catch (err) {
      log("warn", "Failed to retrieve PaymentIntent for gift type", {
        paymentIntentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Extract billing details from the charge
  const donorEmail = charge.billing_details?.email || null;
  const donorName = charge.billing_details?.name || null;
  const amount = charge.amount;
  const currency = charge.currency;

  log("info", "Extracted charge details", {
    chargeId: charge.id,
    paymentIntentId,
    donorEmail,
    donorName,
    amount,
    amountDollars: amount / 100,
    currency,
    giftType,
    billingAddress: charge.billing_details?.address,
  });

  // Try to match donor to a guest by email, name, or phone
  let guestId: string | null = null;
  const billingPhone = charge.billing_details?.phone || null;

  const guest = await findGuest({
    email: donorEmail,
    name: donorName,
    phone: billingPhone,
  });

  if (guest) {
    guestId = guest.id;
    log("info", "Matched charge to guest", {
      chargeId: charge.id,
      donorEmail,
      donorName,
      billingPhone,
      guestId,
      guestName: `${guest.first_name} ${guest.last_name}`,
    });
  } else {
    log("info", "Charge did not match any guest", {
      chargeId: charge.id,
      donorEmail,
      donorName,
      billingPhone,
    });
  }

  // Check if we already have a gift record for this payment intent
  if (paymentIntentId) {
    log("debug", "Checking for existing gift by payment intent", {
      paymentIntentId,
    });

    const existingGift = await db
      .selectFrom("gifts")
      .select([
        "id",
        "donor_email",
        "donor_name",
        "guest_id",
        "status",
        "stripe_checkout_session_id",
      ])
      .where("stripe_payment_intent_id", "=", paymentIntentId)
      .executeTakeFirst();

    if (existingGift) {
      log("info", "Found existing gift by payment intent", {
        existingGiftId: existingGift.id,
        existingEmail: existingGift.donor_email,
        existingName: existingGift.donor_name,
        existingGuestId: existingGift.guest_id,
        existingStatus: existingGift.status,
        hasCheckoutSession: !!existingGift.stripe_checkout_session_id,
      });

      // Update the existing gift with better billing details if available
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        stripe_charge_id: charge.id,
      };

      // Only update if we have better data from the charge
      if (donorEmail && !existingGift.donor_email) {
        updates.donor_email = donorEmail;
        log("debug", "Will update donor_email", {
          from: existingGift.donor_email,
          to: donorEmail,
        });
      }
      if (donorName && !existingGift.donor_name) {
        updates.donor_name = donorName;
        log("debug", "Will update donor_name", {
          from: existingGift.donor_name,
          to: donorName,
        });
      }
      if (guestId && !existingGift.guest_id) {
        updates.guest_id = guestId;
        log("debug", "Will update guest_id", {
          from: existingGift.guest_id,
          to: guestId,
        });
      }

      await db
        .updateTable("gifts")
        .set(updates)
        .where("id", "=", existingGift.id)
        .execute();

      log("info", "Updated existing gift with charge details", {
        giftId: existingGift.id,
        chargeId: charge.id,
        updatedFields: Object.keys(updates),
      });
      return;
    }
  }

  // Check if we already processed this charge (idempotency)
  log("debug", "Checking for existing gift by charge ID", {
    chargeId: charge.id,
  });

  const existingByCharge = await db
    .selectFrom("gifts")
    .select(["id", "status"])
    .where("stripe_charge_id", "=", charge.id)
    .executeTakeFirst();

  if (existingByCharge) {
    log("warn", "Gift already recorded for this charge - skipping", {
      chargeId: charge.id,
      existingGiftId: existingByCharge.id,
      existingStatus: existingByCharge.status,
    });
    return;
  }

  // No existing gift found - create a new record
  log("info", "Creating new gift record from charge", {
    chargeId: charge.id,
    paymentIntentId,
  });

  try {
    const gift = await db
      .insertInto("gifts")
      .values({
        stripe_charge_id: charge.id,
        stripe_payment_intent_id: paymentIntentId,
        donor_email: donorEmail,
        donor_name: donorName,
        amount_cents: amount,
        currency: currency,
        gift_type: giftType,
        guest_id: guestId,
        status: "completed",
        thank_you_email_sent: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    log("info", "✅ Gift recorded from charge", {
      giftId: gift.id,
      chargeId: charge.id,
      paymentIntentId,
      amountDollars: amount / 100,
      currency,
      donorEmail,
      donorName,
      giftType,
      matchedGuest: guestId ? "yes" : "no",
      guestId,
    });

    // Send gift notification email to admin
    await sendGiftNotificationEmail({
      donorName,
      donorEmail,
      amount,
      currency,
      giftType,
      matchedGuest: guest
        ? { firstName: guest.first_name, lastName: guest.last_name }
        : null,
      chargeId: charge.id,
    });
  } catch (error) {
    log("error", "Failed to create gift record from charge", {
      chargeId: charge.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Handle charge.failed event
 * Records failed payment attempts for tracking
 */
async function handleChargeFailed(charge: Stripe.Charge) {
  log("warn", "=== CHARGE FAILED ===", {
    chargeId: charge.id,
    amount: charge.amount,
    amountDollars: charge.amount / 100,
    currency: charge.currency,
    failureCode: charge.failure_code,
    failureMessage: charge.failure_message,
  });

  // Log full charge details for debugging
  log("debug", "Full failed charge details", {
    chargeId: charge.id,
    paymentIntent: charge.payment_intent,
    paymentMethod: charge.payment_method,
    billingDetails: charge.billing_details,
    outcome: charge.outcome,
    metadata: charge.metadata,
  });

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id || null;

  // Extract billing details from the charge
  const donorEmail = charge.billing_details?.email || null;
  const donorName = charge.billing_details?.name || null;
  const amount = charge.amount;
  const currency = charge.currency;
  const failureCode = charge.failure_code || null;
  const failureMessage = charge.failure_message || null;

  log("info", "Failed charge details extracted", {
    chargeId: charge.id,
    paymentIntentId,
    donorEmail,
    donorName,
    amount,
    amountDollars: amount / 100,
    currency,
    failureCode,
    failureMessage,
  });

  // Check if we already have a gift record for this payment intent
  if (paymentIntentId) {
    log("debug", "Checking for existing gift by payment intent", {
      paymentIntentId,
    });

    const existingGift = await db
      .selectFrom("gifts")
      .select(["id", "status"])
      .where("stripe_payment_intent_id", "=", paymentIntentId)
      .executeTakeFirst();

    if (existingGift) {
      log("info", "Found existing gift - updating status to failed", {
        existingGiftId: existingGift.id,
        previousStatus: existingGift.status,
        paymentIntentId,
      });

      // Update the existing gift status to failed
      await db
        .updateTable("gifts")
        .set({
          status: "failed",
          stripe_charge_id: charge.id,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", existingGift.id)
        .execute();

      log("warn", "Updated gift to failed status", {
        giftId: existingGift.id,
        chargeId: charge.id,
        failureCode,
        failureMessage,
      });
      return;
    }
  }

  // Check if we already processed this charge (idempotency)
  log("debug", "Checking for existing gift by charge ID", {
    chargeId: charge.id,
  });

  const existingByCharge = await db
    .selectFrom("gifts")
    .select(["id", "status"])
    .where("stripe_charge_id", "=", charge.id)
    .executeTakeFirst();

  if (existingByCharge) {
    log("warn", "Failed charge already recorded - skipping", {
      chargeId: charge.id,
      existingGiftId: existingByCharge.id,
      existingStatus: existingByCharge.status,
    });
    return;
  }

  // Create a record for the failed charge
  log("info", "Creating new gift record for failed charge", {
    chargeId: charge.id,
    paymentIntentId,
    failureCode,
    failureMessage,
  });

  try {
    const gift = await db
      .insertInto("gifts")
      .values({
        stripe_charge_id: charge.id,
        stripe_payment_intent_id: paymentIntentId,
        donor_email: donorEmail,
        donor_name: donorName,
        amount_cents: amount,
        currency: currency,
        gift_type: null,
        guest_id: null,
        status: "failed",
        thank_you_email_sent: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    log("warn", "⚠️ Failed charge recorded", {
      giftId: gift.id,
      chargeId: charge.id,
      paymentIntentId,
      amountDollars: amount / 100,
      currency,
      donorEmail,
      failureCode,
      failureMessage,
    });
  } catch (error) {
    log("error", "Failed to create gift record for failed charge", {
      chargeId: charge.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Handle charge.pending event
 * Records pending charges (e.g., ACH payments that take time to clear)
 */
async function handleChargePending(charge: Stripe.Charge) {
  log("info", "=== CHARGE PENDING ===", {
    chargeId: charge.id,
    amount: charge.amount,
    amountDollars: charge.amount / 100,
    currency: charge.currency,
    status: charge.status,
  });

  // Log full charge details
  log("debug", "Full pending charge details", {
    chargeId: charge.id,
    paymentIntent: charge.payment_intent,
    paymentMethod: charge.payment_method,
    billingDetails: charge.billing_details,
    metadata: charge.metadata,
  });

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id || null;

  // Determine gift type from the PaymentIntent's product reference
  let giftType: "baby_fund" | "honeymoon" | "student_loans" | null = null;

  if (paymentIntentId) {
    try {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      // The product ID is in payment_details.order_reference
      const productId = (
        paymentIntent as unknown as {
          payment_details?: { order_reference?: string };
        }
      ).payment_details?.order_reference;

      log("debug", "Retrieved PaymentIntent for gift type (pending)", {
        paymentIntentId,
        productId,
      });

      giftType = getGiftTypeFromProductId(productId);

      if (giftType) {
        log("info", "Gift type determined from product ID", {
          giftType,
          productId,
          paymentIntentId,
        });
      }
    } catch (err) {
      log("warn", "Failed to retrieve PaymentIntent for gift type (pending)", {
        paymentIntentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Extract billing details from the charge
  const donorEmail = charge.billing_details?.email || null;
  const donorName = charge.billing_details?.name || null;
  const amount = charge.amount;
  const currency = charge.currency;

  log("info", "Pending charge details extracted", {
    chargeId: charge.id,
    paymentIntentId,
    donorEmail,
    donorName,
    amount,
    amountDollars: amount / 100,
    currency,
    giftType,
  });

  // Try to match donor to a guest by email, name, or phone
  let guestId: string | null = null;
  const billingPhone = charge.billing_details?.phone || null;

  const guest = await findGuest({
    email: donorEmail,
    name: donorName,
    phone: billingPhone,
  });

  if (guest) {
    guestId = guest.id;
    log("info", "Matched pending charge to guest", {
      chargeId: charge.id,
      donorEmail,
      donorName,
      billingPhone,
      guestId,
      guestName: `${guest.first_name} ${guest.last_name}`,
    });
  }

  // Check if we already have a gift record for this payment intent
  if (paymentIntentId) {
    log("debug", "Checking for existing gift by payment intent", {
      paymentIntentId,
    });

    const existingGift = await db
      .selectFrom("gifts")
      .select(["id", "status"])
      .where("stripe_payment_intent_id", "=", paymentIntentId)
      .executeTakeFirst();

    if (existingGift) {
      log("info", "Found existing gift - updating status to pending", {
        existingGiftId: existingGift.id,
        previousStatus: existingGift.status,
        paymentIntentId,
      });

      // Update the existing gift status to pending
      await db
        .updateTable("gifts")
        .set({
          status: "pending",
          stripe_charge_id: charge.id,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", existingGift.id)
        .execute();

      log("info", "Updated gift to pending status", {
        giftId: existingGift.id,
        chargeId: charge.id,
      });
      return;
    }
  }

  // Check if we already processed this charge (idempotency)
  log("debug", "Checking for existing gift by charge ID", {
    chargeId: charge.id,
  });

  const existingByCharge = await db
    .selectFrom("gifts")
    .select(["id", "status"])
    .where("stripe_charge_id", "=", charge.id)
    .executeTakeFirst();

  if (existingByCharge) {
    log("info", "Pending charge already recorded - skipping", {
      chargeId: charge.id,
      existingGiftId: existingByCharge.id,
      existingStatus: existingByCharge.status,
    });
    return;
  }

  // Create a record for the pending charge
  log("info", "Creating new gift record for pending charge", {
    chargeId: charge.id,
    paymentIntentId,
  });

  try {
    const gift = await db
      .insertInto("gifts")
      .values({
        stripe_charge_id: charge.id,
        stripe_payment_intent_id: paymentIntentId,
        donor_email: donorEmail,
        donor_name: donorName,
        amount_cents: amount,
        currency: currency,
        gift_type: giftType,
        guest_id: guestId,
        status: "pending",
        thank_you_email_sent: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    log("info", "⏳ Pending charge recorded", {
      giftId: gift.id,
      chargeId: charge.id,
      paymentIntentId,
      amountDollars: amount / 100,
      currency,
      donorEmail,
      giftType,
      matchedGuest: guestId ? "yes" : "no",
      guestId,
      note: "Payment is pending - will update when charge.succeeded or charge.failed arrives",
    });
  } catch (error) {
    log("error", "Failed to create gift record for pending charge", {
      chargeId: charge.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  log("info", "=== CHARGE REFUNDED ===", {
    chargeId: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    amountDollars: charge.amount / 100,
    amountRefundedDollars: charge.amount_refunded / 100,
    currency: charge.currency,
    refunded: charge.refunded,
  });

  // Log full charge details
  log("debug", "Full refunded charge details", {
    chargeId: charge.id,
    paymentIntent: charge.payment_intent,
    refunds: charge.refunds,
    billingDetails: charge.billing_details,
  });

  // Find the gift by payment intent
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    log("warn", "No payment intent ID found for refunded charge", {
      chargeId: charge.id,
    });
    return;
  }

  log("debug", "Looking up gift by payment intent for refund", {
    paymentIntentId,
    chargeId: charge.id,
  });

  // First check if gift exists
  const existingGift = await db
    .selectFrom("gifts")
    .select(["id", "status", "amount_cents"])
    .where("stripe_payment_intent_id", "=", paymentIntentId)
    .executeTakeFirst();

  if (!existingGift) {
    log("warn", "No gift found for refunded charge", {
      chargeId: charge.id,
      paymentIntentId,
    });
    return;
  }

  log("info", "Found gift to mark as refunded", {
    giftId: existingGift.id,
    previousStatus: existingGift.status,
    originalAmountCents: existingGift.amount_cents,
    refundedAmountCents: charge.amount_refunded,
  });

  // Update the gift status
  const result = await db
    .updateTable("gifts")
    .set({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .where("stripe_payment_intent_id", "=", paymentIntentId)
    .executeTakeFirst();

  log("info", "💰 Refund processed", {
    giftId: existingGift.id,
    chargeId: charge.id,
    paymentIntentId,
    rowsUpdated: result.numUpdatedRows?.toString() || "unknown",
    refundedAmountDollars: charge.amount_refunded / 100,
  });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  log("info", "========================================");
  log("info", "STRIPE WEBHOOK REQUEST RECEIVED", {
    requestId,
    method: request.method,
    url: request.url,
    headers: {
      "content-type": request.headers.get("content-type"),
      "stripe-signature": request.headers.get("stripe-signature")
        ? "[PRESENT]"
        : "[MISSING]",
      "user-agent": request.headers.get("user-agent"),
    },
  });

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    log("debug", "Request body received", {
      requestId,
      bodyLength: body.length,
      bodyPreview: body.slice(0, 200) + (body.length > 200 ? "..." : ""),
    });

    if (!signature) {
      log("error", "No Stripe signature found in request", { requestId });
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 },
      );
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      log("error", "STRIPE_WEBHOOK_SECRET not configured in environment", {
        requestId,
      });
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    log("debug", "Verifying webhook signature", { requestId });

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
      log("info", "Webhook signature verified successfully", {
        requestId,
        eventId: event.id,
        eventType: event.type,
        apiVersion: event.api_version,
        created: new Date(event.created * 1000).toISOString(),
      });
    } catch (err) {
      log("error", "Webhook signature verification failed", {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    log("info", "Processing webhook event", {
      requestId,
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    });

    // Log the event data object for debugging
    log("debug", "Event data object", {
      requestId,
      eventId: event.id,
      eventType: event.type,
      dataObject: event.data.object,
    });

    const startTime = Date.now();

    // Handle the event
    // We only listen to charge events to avoid duplicate records
    // (checkout.session.completed and charge.succeeded both fire for the same payment)
    switch (event.type) {
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        log("info", "Handling charge.succeeded", {
          requestId,
          chargeId: charge.id,
        });
        await handleChargeSucceeded(charge);
        break;
      }

      case "charge.failed": {
        const charge = event.data.object as Stripe.Charge;
        log("info", "Handling charge.failed", {
          requestId,
          chargeId: charge.id,
        });
        await handleChargeFailed(charge);
        break;
      }

      case "charge.pending": {
        const charge = event.data.object as Stripe.Charge;
        log("info", "Handling charge.pending", {
          requestId,
          chargeId: charge.id,
        });
        await handleChargePending(charge);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        log("info", "Handling charge.refunded", {
          requestId,
          chargeId: charge.id,
        });
        await handleChargeRefunded(charge);
        break;
      }

      default:
        log("info", "Unhandled event type - acknowledging receipt", {
          requestId,
          eventType: event.type,
          eventId: event.id,
        });
    }

    const processingTime = Date.now() - startTime;

    log("info", "✅ Webhook processed successfully", {
      requestId,
      eventId: event.id,
      eventType: event.type,
      processingTimeMs: processingTime,
    });
    log("info", "========================================");

    return NextResponse.json({ received: true });
  } catch (error) {
    log("error", "❌ Error processing Stripe webhook", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    log("info", "========================================");

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
