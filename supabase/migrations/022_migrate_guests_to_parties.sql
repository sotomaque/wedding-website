-- Migration 022: Migrate existing guests to parties
-- Creates parties from existing unique invite_codes and links guests to them
-- Ensures plus-ones are grouped with their primary guests

-- Step 1: Create parties from existing unique invite_codes
-- Uses the primary guest's (non-plus-one) side/list/family as the party defaults
-- ON CONFLICT: skip if party with this invite_code already exists
INSERT INTO parties (invite_code, side, list, family)
SELECT DISTINCT ON (invite_code)
  invite_code,
  side,
  list,
  CASE WHEN family = true THEN first_name || ' Family' ELSE NULL END as family
FROM guests
WHERE invite_code IS NOT NULL
  AND is_plus_one = false
ORDER BY invite_code, created_at ASC
ON CONFLICT (invite_code) DO NOTHING;

-- Step 2: Insert any remaining invite_codes that only had plus-ones (edge case)
INSERT INTO parties (invite_code, side, list, family)
SELECT DISTINCT ON (invite_code)
  invite_code,
  side,
  list,
  NULL as family
FROM guests
WHERE invite_code IS NOT NULL
  AND invite_code NOT IN (SELECT invite_code FROM parties)
ORDER BY invite_code, created_at ASC
ON CONFLICT (invite_code) DO NOTHING;

-- Step 3: Update all guests (primary and plus-ones) to reference their party
-- Safe to re-run: just overwrites party_id with the same value
UPDATE guests g
SET party_id = p.id
FROM parties p
WHERE g.invite_code = p.invite_code;

-- Step 4: Handle edge case where plus-ones might have NULL invite_code
-- but have a primary_guest_id - assign them to their primary's party
-- Safe to re-run: only updates rows where party_id IS NULL
UPDATE guests plus_one
SET party_id = primary_guest.party_id
FROM guests primary_guest
WHERE plus_one.is_plus_one = true
  AND plus_one.primary_guest_id = primary_guest.id
  AND plus_one.party_id IS NULL
  AND primary_guest.party_id IS NOT NULL;

-- Note: invite_code column on guests is kept temporarily for rollback safety
-- It can be dropped in a later migration after verification:
-- ALTER TABLE guests DROP COLUMN invite_code;
