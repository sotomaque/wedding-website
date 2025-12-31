# RSVP Plus-One Flows - Test Plan

This document describes all the plus-one scenarios that are now properly supported.

## Supported Flows

### Flow 1: Admin creates invitee with plus-one (no name), user RSVPs and adds name
**Steps:**
1. Admin creates guest with `plus_one_allowed = true` and `plus_one_name = null`
2. User visits RSVP page and enters invite code
3. User selects "Joyfully Accept"
4. User toggles "Will your plus-one be attending?" to YES
5. User enters plus-one name in the text field
6. User submits RSVP

**Expected Result:**
- Primary guest: `rsvp_status = 'yes'`
- New plus-one record created with:
  - `first_name` and `last_name` split from provided name
  - `is_plus_one = true`
  - `primary_guest_id` = primary guest's ID
  - Same `invite_code` as primary guest
  - `rsvp_status = 'yes'`

---

### Flow 2: Admin creates invitee with plus-one (no name), user RSVPs and says no plus-one
**Steps:**
1. Admin creates guest with `plus_one_allowed = true` and `plus_one_name = null`
2. User visits RSVP page and enters invite code
3. User selects "Joyfully Accept"
4. User leaves "Will your plus-one be attending?" toggle OFF (or toggles it then turns it off)
5. User submits RSVP

**Expected Result:**
- Primary guest: `rsvp_status = 'yes'`
- No plus-one record created
- Primary guest can still add plus-one later by updating RSVP

---

### Flow 3: Admin creates invitee with plus-one (with name), user confirms plus-one attending
**Steps:**
1. Admin creates guest with `plus_one_allowed = true` and provides a name
2. Admin system automatically creates plus-one record
3. User visits RSVP page and enters invite code
4. User sees both their name and plus-one name listed
5. User selects "Joyfully Accept"
6. User toggles "Will your plus-one be attending?" to YES
7. User sees plus-one name pre-filled
8. User submits RSVP

**Expected Result:**
- Primary guest: `rsvp_status = 'yes'`
- Existing plus-one record updated:
  - `rsvp_status = 'yes'`
  - Name remains as originally set by admin

---

### Flow 4: Admin creates invitee with plus-one (with name), user says plus-one not coming
**Steps:**
1. Admin creates guest with `plus_one_allowed = true` and provides a name
2. Admin system automatically creates plus-one record
3. User visits RSVP page and enters invite code
4. User selects "Joyfully Accept"
5. User leaves "Will your plus-one be attending?" toggle OFF
6. User submits RSVP

**Expected Result:**
- Primary guest: `rsvp_status = 'yes'`
- Existing plus-one record updated:
  - `rsvp_status = 'no'`

---

### Flow 5: User declines, both marked as not attending
**Steps:**
1. Admin creates guest with `plus_one_allowed = true` (with or without name)
2. User visits RSVP page and enters invite code
3. User selects "Regretfully Decline"
4. User submits RSVP

**Expected Result:**
- Primary guest: `rsvp_status = 'no'`
- If plus-one record exists: `rsvp_status = 'no'`
- Dietary restrictions cleared for both

---

## Invite Code Consistency

**Requirement:** User and their plus-one share the same invite code

**Implementation:**
- When creating a plus-one record (either via admin or RSVP):
  - Plus-one receives same `invite_code` as primary guest
  - Plus-one has `is_plus_one = true`
  - Plus-one has `primary_guest_id` pointing to primary guest

**Verification:**
- Both records can be retrieved with the same invite code
- RSVP page shows both guests when code is entered
- Both guests updated atomically during RSVP submission

---

## Architecture Improvements

### Server Components & Server Actions

**Old approach (removed):**
- Client component with `useEffect` for data fetching
- Multiple API routes (`/api/rsvp/verify`, `/api/rsvp/submit`, `/api/rsvp/update-info`)
- Client-side state management

**New approach:**
- Server Component for initial page load
- Server Actions for data mutations (`verifyInviteCode`, `submitRSVP`)
- Client components only for interactive forms
- Automatic revalidation with `revalidatePath`

### Files Structure

```
app/rsvp/
├── page.tsx              # Server Component (entry point)
├── rsvp-client.tsx       # Client wrapper (manages step state)
├── code-entry.tsx        # Client component (code input)
├── rsvp-form.tsx         # Client component (RSVP form)
└── actions.ts            # Server Actions
```

### Benefits

1. **Better Performance**: Initial HTML rendered on server
2. **Better SEO**: Content available without JavaScript
3. **Type Safety**: End-to-end type safety with Server Actions
4. **Simpler Code**: No useEffect dependency management
5. **Automatic Revalidation**: Server Actions handle cache invalidation

---

## Testing Checklist

- [ ] Flow 1: Create invitee with plus-one (no name), RSVP yes with plus-one name
- [ ] Flow 2: Create invitee with plus-one (no name), RSVP yes without plus-one
- [ ] Flow 3: Create invitee with plus-one (with name), confirm plus-one attending
- [ ] Flow 4: Create invitee with plus-one (with name), mark plus-one not attending
- [ ] Flow 5: Decline invitation, verify both marked as not attending
- [ ] Verify invite code is same for primary guest and plus-one
- [ ] Update RSVP after initial submission (all scenarios)
- [ ] Verify dietary restrictions apply to both guests
- [ ] Verify contact info updates correctly
- [ ] Test with invalid invite code
- [ ] Test form validation (required fields)

---

## Database Schema Notes

The `guests` table supports these relationships:

- **Primary guest**: `is_plus_one = false`, `primary_guest_id = null`
- **Plus-one guest**: `is_plus_one = true`, `primary_guest_id = <primary_id>`
- Both share the same `invite_code`
- Both can have separate `rsvp_status` values
- Plus-one inherits `side`, `list`, and contact info from primary guest
