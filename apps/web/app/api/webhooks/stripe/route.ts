import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/env";
import { db } from "@/lib/db";

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

// Map payment link IDs to gift types
// You'll need to update these with your actual payment link IDs from Stripe
const PAYMENT_LINK_TO_GIFT_TYPE: Record<
  string,
  "baby_fund" | "honeymoon" | "student_loans"
> = {
  // These will be populated based on the payment link ID in the checkout session
  // The payment link ID is available in session.payment_link
};

/**
 * Determine gift type from payment link URL or ID
 */
function getGiftTypeFromPaymentLink(
  paymentLinkId: string | null,
  paymentLinkUrl: string | null,
): "baby_fund" | "honeymoon" | "student_loans" | null {
  log("debug", "Determining gift type from payment link", {
    paymentLinkId,
    paymentLinkUrl,
    configuredLinks: {
      babyFund: env.NEXT_PUBLIC_STRIPE_LINK_BABY_FUND || "NOT SET",
      honeymoon: env.NEXT_PUBLIC_STRIPE_LINK_HONEYMOON || "NOT SET",
      studentLoans: env.NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS || "NOT SET",
    },
  });

  // First check if we have a direct mapping
  if (paymentLinkId && PAYMENT_LINK_TO_GIFT_TYPE[paymentLinkId]) {
    const giftType = PAYMENT_LINK_TO_GIFT_TYPE[paymentLinkId];
    log("info", "Gift type determined from direct mapping", {
      paymentLinkId,
      giftType,
    });
    return giftType;
  }

  // Fall back to checking the URL patterns from env vars
  if (paymentLinkUrl) {
    const babyFundSlug =
      env.NEXT_PUBLIC_STRIPE_LINK_BABY_FUND?.split("/").pop() || "";
    const honeymoonSlug =
      env.NEXT_PUBLIC_STRIPE_LINK_HONEYMOON?.split("/").pop() || "";
    const studentLoansSlug =
      env.NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS?.split("/").pop() || "";

    log("debug", "Checking payment link URL against slugs", {
      paymentLinkUrl,
      babyFundSlug,
      honeymoonSlug,
      studentLoansSlug,
    });

    if (babyFundSlug && paymentLinkUrl.includes(babyFundSlug)) {
      log("info", "Gift type determined: baby_fund", { paymentLinkUrl });
      return "baby_fund";
    }
    if (honeymoonSlug && paymentLinkUrl.includes(honeymoonSlug)) {
      log("info", "Gift type determined: honeymoon", { paymentLinkUrl });
      return "honeymoon";
    }
    if (studentLoansSlug && paymentLinkUrl.includes(studentLoansSlug)) {
      log("info", "Gift type determined: student_loans", { paymentLinkUrl });
      return "student_loans";
    }
  }

  // Also check the paymentLinkId against the URL slugs (Stripe sometimes uses the slug as ID)
  if (paymentLinkId) {
    const babyFundSlug =
      env.NEXT_PUBLIC_STRIPE_LINK_BABY_FUND?.split("/").pop() || "";
    const honeymoonSlug =
      env.NEXT_PUBLIC_STRIPE_LINK_HONEYMOON?.split("/").pop() || "";
    const studentLoansSlug =
      env.NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS?.split("/").pop() || "";

    log("debug", "Checking payment link ID against slugs", {
      paymentLinkId,
      babyFundSlug,
      honeymoonSlug,
      studentLoansSlug,
    });

    if (babyFundSlug && paymentLinkId.includes(babyFundSlug)) {
      log("info", "Gift type determined from ID: baby_fund", { paymentLinkId });
      return "baby_fund";
    }
    if (honeymoonSlug && paymentLinkId.includes(honeymoonSlug)) {
      log("info", "Gift type determined from ID: honeymoon", { paymentLinkId });
      return "honeymoon";
    }
    if (studentLoansSlug && paymentLinkId.includes(studentLoansSlug)) {
      log("info", "Gift type determined from ID: student_loans", {
        paymentLinkId,
      });
      return "student_loans";
    }
  }

  log("warn", "Could not determine gift type from payment link", {
    paymentLinkId,
    paymentLinkUrl,
  });
  return null;
}

/**
 * Find a guest by email address
 */
async function findGuestByEmail(email: string) {
  log("debug", "Looking up guest by email", { email: email.toLowerCase() });

  const guest = await db
    .selectFrom("guests")
    .selectAll()
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();

  if (guest) {
    log("info", "Found matching guest", {
      guestId: guest.id,
      guestName: `${guest.first_name} ${guest.last_name}`,
      guestEmail: guest.email,
    });
  } else {
    log("debug", "No matching guest found for email", { email });
  }

  return guest;
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  log("info", "=== CHECKOUT SESSION COMPLETED ===", {
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    paymentStatus: session.payment_status,
  });

  // Log full session details for debugging
  log("debug", "Full checkout session details", {
    sessionId: session.id,
    customerId: session.customer,
    customerDetails: session.customer_details,
    amountTotal: session.amount_total,
    amountSubtotal: session.amount_subtotal,
    currency: session.currency,
    paymentIntent: session.payment_intent,
    paymentLink: session.payment_link,
    metadata: session.metadata,
    successUrl: session.success_url,
    cancelUrl: session.cancel_url,
  });

  // Extract donor information
  const donorEmail = session.customer_details?.email || null;
  const donorName = session.customer_details?.name || null;
  const amountTotal = session.amount_total || 0;
  const currency = session.currency || "usd";
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  const paymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id || null;

  log("info", "Extracted donor information", {
    donorEmail,
    donorName,
    amountTotal,
    amountDollars: amountTotal / 100,
    currency,
    paymentIntentId,
    paymentLinkId,
  });

  // Determine gift type from payment link
  const giftType = getGiftTypeFromPaymentLink(paymentLinkId, null);
  log("info", "Gift type determination result", { giftType, paymentLinkId });

  // Try to match donor email to a guest
  let guestId: string | null = null;
  if (donorEmail) {
    const guest = await findGuestByEmail(donorEmail);
    if (guest) {
      guestId = guest.id;
      log("info", "Matched donation to guest", {
        donorEmail,
        guestId,
        guestName: `${guest.first_name} ${guest.last_name}`,
      });
    } else {
      log("info", "Donor email did not match any guest", { donorEmail });
    }
  } else {
    log("warn", "No donor email available for guest matching");
  }

  // Check if we already processed this session (idempotency)
  log("debug", "Checking for existing gift record by session ID", {
    sessionId: session.id,
  });

  const existingGift = await db
    .selectFrom("gifts")
    .select(["id", "status", "created_at"])
    .where("stripe_checkout_session_id", "=", session.id)
    .executeTakeFirst();

  if (existingGift) {
    log("warn", "Gift already recorded for this session - skipping", {
      sessionId: session.id,
      existingGiftId: existingGift.id,
      existingStatus: existingGift.status,
      createdAt: existingGift.created_at,
    });
    return;
  }

  // Also check by payment intent ID
  if (paymentIntentId) {
    log("debug", "Checking for existing gift record by payment intent ID", {
      paymentIntentId,
    });

    const existingByPaymentIntent = await db
      .selectFrom("gifts")
      .select([
        "id",
        "status",
        "stripe_checkout_session_id",
        "stripe_charge_id",
      ])
      .where("stripe_payment_intent_id", "=", paymentIntentId)
      .executeTakeFirst();

    if (existingByPaymentIntent) {
      log(
        "info",
        "Found existing gift by payment intent - updating with session details",
        {
          existingGiftId: existingByPaymentIntent.id,
          paymentIntentId,
          sessionId: session.id,
        },
      );

      // Update existing record with checkout session details
      await db
        .updateTable("gifts")
        .set({
          stripe_checkout_session_id: session.id,
          stripe_payment_link_id: paymentLinkId,
          gift_type: giftType,
          donor_email: donorEmail,
          donor_name: donorName,
          guest_id: guestId,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", existingByPaymentIntent.id)
        .execute();

      log("info", "Updated existing gift with checkout session details", {
        giftId: existingByPaymentIntent.id,
        updatedFields: {
          stripe_checkout_session_id: session.id,
          stripe_payment_link_id: paymentLinkId,
          gift_type: giftType,
          donor_email: donorEmail,
          donor_name: donorName,
          guest_id: guestId,
        },
      });
      return;
    }
  }

  // Insert the gift record
  log("info", "Creating new gift record", {
    sessionId: session.id,
    paymentIntentId,
    paymentLinkId,
    donorEmail,
    donorName,
    amountCents: amountTotal,
    currency,
    giftType,
    guestId,
  });

  try {
    const gift = await db
      .insertInto("gifts")
      .values({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_link_id: paymentLinkId,
        donor_email: donorEmail,
        donor_name: donorName,
        amount_cents: amountTotal,
        currency: currency,
        gift_type: giftType,
        guest_id: guestId,
        status: "completed",
        thank_you_email_sent: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    log("info", "✅ Gift record created successfully", {
      giftId: gift.id,
      sessionId: session.id,
      amountDollars: amountTotal / 100,
      currency,
      giftType,
      donorEmail,
      donorName,
      matchedGuest: guestId ? "yes" : "no",
      guestId,
    });
  } catch (error) {
    log("error", "Failed to create gift record", {
      sessionId: session.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
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
    metadata: charge.metadata,
    receiptEmail: charge.receipt_email,
    receiptUrl: charge.receipt_url,
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

  log("info", "Extracted charge details", {
    chargeId: charge.id,
    paymentIntentId,
    donorEmail,
    donorName,
    amount,
    amountDollars: amount / 100,
    currency,
    billingAddress: charge.billing_details?.address,
  });

  // Try to match donor email to a guest
  let guestId: string | null = null;
  if (donorEmail) {
    const guest = await findGuestByEmail(donorEmail);
    if (guest) {
      guestId = guest.id;
      log("info", "Matched charge to guest", {
        chargeId: charge.id,
        donorEmail,
        guestId,
        guestName: `${guest.first_name} ${guest.last_name}`,
      });
    } else {
      log("info", "Charge donor email did not match any guest", {
        chargeId: charge.id,
        donorEmail,
      });
    }
  } else {
    log("warn", "No billing email available on charge", {
      chargeId: charge.id,
    });
  }

  // Check if we already have a gift record for this payment intent
  // (may have been created by checkout.session.completed)
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
  // This handles cases where charge.succeeded arrives before checkout.session.completed
  // or for direct charges without a checkout session
  log(
    "info",
    "Creating new gift record from charge (no checkout session found)",
    {
      chargeId: charge.id,
      paymentIntentId,
    },
  );

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
        gift_type: null, // Will be updated by checkout.session.completed if available
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
      matchedGuest: guestId ? "yes" : "no",
      guestId,
      note: "Gift type will be set when checkout.session.completed arrives",
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
  });

  // Try to match donor email to a guest
  let guestId: string | null = null;
  if (donorEmail) {
    const guest = await findGuestByEmail(donorEmail);
    if (guest) {
      guestId = guest.id;
      log("info", "Matched pending charge to guest", {
        chargeId: charge.id,
        donorEmail,
        guestId,
        guestName: `${guest.first_name} ${guest.last_name}`,
      });
    }
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
        gift_type: null,
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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        log("info", "Handling checkout.session.completed", {
          requestId,
          sessionId: session.id,
        });
        await handleCheckoutSessionCompleted(session);
        break;
      }

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
