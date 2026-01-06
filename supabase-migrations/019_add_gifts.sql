-- Migration: Add gifts table for Stripe webhook tracking
-- Tracks donations made through Stripe payment links

CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe data
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_payment_link_id TEXT,
  stripe_charge_id TEXT UNIQUE,

  -- Donor information (from Stripe)
  donor_email TEXT,
  donor_name TEXT,

  -- Gift details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  gift_type TEXT CHECK (gift_type IN ('baby_fund', 'honeymoon', 'student_loans')),

  -- Guest matching (if donor email matches a guest)
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),

  -- Thank you email tracking
  thank_you_email_sent BOOLEAN NOT NULL DEFAULT false,
  thank_you_email_sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_gifts_donor_email ON gifts(donor_email);
CREATE INDEX idx_gifts_guest_id ON gifts(guest_id);
CREATE INDEX idx_gifts_stripe_session ON gifts(stripe_checkout_session_id);
CREATE INDEX idx_gifts_stripe_payment_intent ON gifts(stripe_payment_intent_id);
CREATE INDEX idx_gifts_stripe_charge ON gifts(stripe_charge_id);
CREATE INDEX idx_gifts_gift_type ON gifts(gift_type);
CREATE INDEX idx_gifts_status ON gifts(status);
CREATE INDEX idx_gifts_thank_you_pending ON gifts(thank_you_email_sent) WHERE thank_you_email_sent = false;
CREATE INDEX idx_gifts_created_at ON gifts(created_at DESC);

-- Add comments
COMMENT ON TABLE gifts IS 'Tracks donations received via Stripe payment links';
COMMENT ON COLUMN gifts.stripe_checkout_session_id IS 'Unique Stripe checkout session ID';
COMMENT ON COLUMN gifts.stripe_payment_link_id IS 'Stripe payment link ID to identify which fund';
COMMENT ON COLUMN gifts.guest_id IS 'Matched guest if donor email exists in guests table';
COMMENT ON COLUMN gifts.gift_type IS 'Type of gift fund: baby_fund, honeymoon, or student_loans';
COMMENT ON COLUMN gifts.amount_cents IS 'Amount in cents (e.g., 5000 = $50.00)';
