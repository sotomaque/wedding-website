# Migration Instructions: Split Name into First Name and Last Name

This migration splits the `name` column in the `guests` table into `first_name` and `last_name` columns.

## ⚠️ Current Status

**All code changes are complete.** TypeScript errors are expected until you complete steps 1 and 2 below.

The codebase has been updated to use `first_name` and `last_name`, but the database schema and TypeScript types need to be updated to match.

## Steps to Apply Migration

### 1. Run the SQL Migration in Supabase

Go to your Supabase SQL Editor and run the migration file:

```bash
supabase-migrations/003_split_name_into_first_last.sql
```

Or copy and paste the SQL directly into the Supabase SQL Editor.

### 2. Regenerate TypeScript Types

After running the migration, regenerate the TypeScript types from your Supabase database.

If you're using Supabase CLI:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/lib/supabase/types.ts
```

Or manually update `apps/web/lib/supabase/types.ts` to replace `name: string` with:
- `first_name: string`
- `last_name: string | null`

### 3. Verify Changes

The following files have been updated to use `first_name` and `last_name`:

**Type Definitions:**
- ✅ `apps/web/lib/supabase/types.ts` - Updated manually
- ✅ `apps/web/lib/validations/guest.ts` - Updated schemas

**Admin Portal:**
- ✅ `apps/web/app/admin/guests/columns.tsx` - Shows combined name in table
- ✅ `apps/web/app/admin/guests/edit-guest-form.tsx` - Separate first/last name inputs
- ✅ `apps/web/app/admin/guests/add-guest-form.tsx` - Separate first/last name inputs

**API Routes:**
- ✅ `apps/web/app/api/admin/guests/route.ts` - POST endpoint (create guest)
- ✅ `apps/web/app/api/admin/guests/[id]/route.ts` - PATCH endpoint (update guest)
- ✅ `apps/web/app/api/admin/guests/resend-email/route.ts` - Resend email with new name format

**RSVP Page:**
- ✅ `apps/web/app/rsvp/page.tsx` - Display combined name

**Database:**
- ✅ `supabase-migrations/003_split_name_into_first_last.sql` - Migration script

### 4. Test the Changes

After applying the migration and regenerating types:

1. **Create a new guest** - Should save first_name and last_name separately
2. **Edit an existing guest** - Should display separate first/last name fields
3. **View guest table** - Should show combined "First Last" name
4. **Add plus-one** - Plus-one names should be split automatically

## What Changed

### Database Schema
- **Added:** `first_name` column (TEXT, NOT NULL)
- **Added:** `last_name` column (TEXT, NULL)
- **Removed:** `name` column
- Existing data is migrated by splitting on the first space

### UI Changes
- Admin forms now have separate "First Name" and "Last Name" fields
- Guest table still shows full name in a single "Name" column
- Plus-one names are automatically split when saved

### API Changes
- POST/PATCH endpoints now accept `firstName` and `lastName` instead of `name`
- Email templates use `firstName` and optionally `lastName`
- Plus-one names are split into first/last when creating linked guest records

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Add name column back
ALTER TABLE guests
ADD COLUMN name TEXT;

-- Combine first_name and last_name
UPDATE guests
SET name = CONCAT(first_name, ' ', COALESCE(last_name, ''));

-- Make name required
ALTER TABLE guests
ALTER COLUMN name SET NOT NULL;

-- Drop first_name and last_name
ALTER TABLE guests
DROP COLUMN first_name,
DROP COLUMN last_name;
```

Then revert the code changes by checking out the previous commit.

---

# Migration Instructions: Add C List Support and Cascade Updates

## ⚠️ Current Status

**This migration is REQUIRED to fix the current error.** The application code has been updated to support C List, but the database still only allows A and B lists.

**Error you're seeing:**
```
error: new row for relation "guests" violates check constraint "guests_list_check"
```

## What This Migration Does

This migration adds two important features:

1. **C List Support**: Updates the database constraint to allow guests to be assigned to List A, B, or C (previously only A and B were allowed)
2. **Automatic Cascade Updates**: Adds a database trigger that automatically updates plus-ones when their primary guest's list or family status changes

## Steps to Apply Migration

### 1. Run the SQL Migration in Supabase

Go to your Supabase SQL Editor and run the migration file:

```bash
supabase-migrations/006_add_c_list_and_cascade_updates.sql
```

Or copy and paste the SQL directly into the Supabase SQL Editor:

1. Open https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy the contents of `supabase-migrations/006_add_c_list_and_cascade_updates.sql`
6. Paste and click "Run"

### 2. Verify the Migration

The migration will:
- Drop the old `guests_list_check` constraint
- Add a new constraint allowing 'a', 'b', or 'c'
- Create a trigger function `cascade_guest_updates_to_plus_ones()`
- Create a trigger `trigger_cascade_to_plus_ones` that runs after guest updates

## What This Fixes

**Before Migration:**
- ❌ Trying to set a guest to "C List" fails with a constraint violation error
- ❌ Updating a primary guest's list or family status does NOT update their plus-one

**After Migration:**
- ✅ Guests can be assigned to A, B, or C lists
- ✅ When you update a primary guest's list (e.g., from A to B), their plus-one automatically gets updated to list B
- ✅ When you update a primary guest's family status (e.g., from false to true), their plus-one automatically becomes a family member too
- ✅ The cascade works both ways - if you remove family status, it's removed from the plus-one too

## Files Updated

**Database Schema:**
- ✅ `apps/web/lib/supabase/types.ts` - Added 'c' to list type union
- ✅ `apps/web/lib/db/types.ts` - Added 'c' to list type union (if exists)

**Validation Schemas:**
- ✅ `apps/web/lib/validations/guest.ts` - Updated both add and edit schemas to allow 'c'

**Admin Forms:**
- ✅ `apps/web/app/admin/guests/add-guest-form.tsx` - Added C List option
- ✅ `apps/web/app/admin/guests/edit-guest-form.tsx` - Added C List option

**Database Migration:**
- ✅ `supabase-migrations/006_add_c_list_and_cascade_updates.sql` - New migration file

## Testing the Migration

After running the migration:

1. **Test C List Support:**
   - Edit a guest in the admin panel
   - Change their list to "C List"
   - Save the changes
   - Should work without errors ✅

2. **Test Cascade Updates:**
   - Find a guest that has a plus-one
   - Change the primary guest's list (e.g., from A to C)
   - Refresh the page or check the plus-one's record
   - The plus-one should now also be on list C ✅

3. **Test Family Cascade:**
   - Find a guest with a plus-one
   - Toggle the family status of the primary guest
   - The plus-one's family status should automatically match ✅

## Troubleshooting

**Error: "constraint 'guests_list_check' does not exist"**
- This is fine - the migration handles this with `IF EXISTS`
- The migration will still create the new constraint

**Error: "function cascade_guest_updates_to_plus_ones() already exists"**
- Run this first to clean up:
  ```sql
  DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;
  DROP FUNCTION IF EXISTS cascade_guest_updates_to_plus_ones();
  ```
- Then run the full migration again

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;

-- Remove the function
DROP FUNCTION IF EXISTS cascade_guest_updates_to_plus_ones();

-- Restore old constraint (WARNING: This will fail if you have any 'c' list guests)
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_list_check;

ALTER TABLE guests
ADD CONSTRAINT guests_list_check
CHECK (list IN ('a', 'b'));
```

**Note:** You cannot rollback if you have guests assigned to list 'c'. You would need to reassign them to 'a' or 'b' first.

---

# Migration Instructions: Add "Both" Side Option

## ⚠️ Current Status

**This migration is OPTIONAL but recommended.** The application code has been updated to support "Both" as a side option, but the database currently only allows "bride" or "groom".

## What This Migration Does

This migration adds a third side option:
- **Both Side Support**: Updates the database constraint to allow guests to be assigned to "bride", "groom", or "both" sides

This is useful for guests who are close to both the bride and groom (e.g., mutual friends, family friends).

## Steps to Apply Migration

### 1. Run the SQL Migration in Supabase

Go to your Supabase SQL Editor and run the migration file:

```bash
supabase-migrations/007_add_both_side.sql
```

Or copy and paste the SQL directly into the Supabase SQL Editor:

1. Open https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy the contents of `supabase-migrations/007_add_both_side.sql`
6. Paste and click "Run"

### 2. Verify the Migration

The migration will:
- Drop the old `guests_side_check` constraint (if it exists)
- Add a new constraint allowing 'bride', 'groom', 'both', or NULL

## What This Enables

**Before Migration:**
- ❌ Guests can only be assigned to "Bride" or "Groom" side

**After Migration:**
- ✅ Guests can be assigned to "Bride", "Groom", or "Both" sides
- ✅ "Both" option appears in admin forms
- ✅ Useful for mutual friends or family friends

## Files Updated

**Database Schema:**
- ✅ `apps/web/lib/supabase/types.ts` - Added 'both' to side type union

**Validation Schemas:**
- ✅ `apps/web/lib/validations/guest.ts` - Updated both add and edit schemas to allow 'both'

**Admin Forms:**
- ✅ `apps/web/app/admin/guests/add-guest-form.tsx` - Added "Both" side option
- ✅ `apps/web/app/admin/guests/edit-guest-form.tsx` - Added "Both" side option

**Database Migration:**
- ✅ `supabase-migrations/007_add_both_side.sql` - New migration file

## Testing the Migration

After running the migration:

1. **Test Both Side Assignment:**
   - Edit a guest in the admin panel
   - Change their side to "Both"
   - Save the changes
   - Should work without errors ✅

2. **Verify Existing Data:**
   - Existing guests with "Bride" or "Groom" side should remain unchanged ✅

## Troubleshooting

**Error: "constraint 'guests_side_check' does not exist"**
- This is fine - the migration handles this with `IF EXISTS`
- The migration will still create the new constraint

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop the new constraint
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_side_check;

-- Restore old constraint (WARNING: This will fail if you have any 'both' side guests)
ALTER TABLE guests
ADD CONSTRAINT guests_side_check
CHECK (side IN ('bride', 'groom') OR side IS NULL);
```

**Note:** You cannot rollback if you have guests assigned to side 'both'. You would need to reassign them to 'bride' or 'groom' first.
