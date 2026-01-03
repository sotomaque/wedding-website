# Email Templates

This directory contains email templates for admin notifications.

## Template Management

**Guest-facing invitation emails** are now managed in the [Resend Dashboard](https://resend.com/templates) using Resend's template system. This allows for:

- Easy visual editing without code changes
- A/B testing capabilities
- Version history and rollback
- Template previews before sending

The template IDs are referenced in the API routes (e.g., `DEFAULT_TEMPLATE_ID` in `/api/admin/guests/route.ts`).

## Local Templates (Admin Notifications)

The remaining templates in this directory are for admin notifications (sent to RSVP_EMAIL addresses):

### `rsvp-notification.tsx`

Notification sent to admins when a guest submits their RSVP.

### `event-rsvp-notification.tsx`

Notification sent to admins when a guest responds to a custom event invitation.

### `event-invitation.tsx`

Email template for inviting guests to custom events (non-default events like rehearsal dinner).

### `activities-invitation.tsx`

Email for inviting guests to explore San Diego activities.

## Creating New Templates

When creating a new email template:

1. Create a new `.tsx` file in this directory
2. Define an interface for the template props
3. Export a function that returns an HTML string
4. Include proper inline CSS (most email clients strip external styles)
5. Test across multiple email clients

## Design Guidelines

- Use inline styles (CSS classes are often stripped by email clients)
- Test background images (some clients block them by default)
- Keep layouts simple and table-based for maximum compatibility
- Include alt text for images
- Provide text fallbacks for links
- Use web-safe fonts as fallbacks
- Target max-width of 600px for content

## Template Variables (Resend)

When using Resend templates, variables use triple braces: `{{{VARIABLE_NAME}}}`

**Reserved variables** (auto-populated by Resend):
- `FIRST_NAME`
- `LAST_NAME`
- `EMAIL`

**Custom variables** (defined when creating template):
- `INVITE_CODE`
- `RSVP_URL`
- `APP_URL`
- `WEDDING_DATE`
